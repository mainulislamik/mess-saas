import uuid
import calendar
import csv
import io
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.meal import Meal
from app.models.bazar import Bazar
from app.models.deposit import Deposit
from app.models.fixed_cost import FixedCost
from app.models.member_rent import MemberMonthlyRent
from app.models.enums import FixedCostCategory, BazarStatus
from app.core.deps import get_current_user, get_membership_for_mess, get_safe_month
from app.schemas.master_sheet import (
    MasterSheetResponse,
    MasterSheetKPIs,
    MasterSheetMember,
    MasterSheetDailyTotal,
    MasterSheetBazarItem,
    MasterSheetFixedCostItem,
)

router = APIRouter(prefix="/messes/{mess_id}/master-sheet", tags=["Master Sheet"])

@router.get("", response_model=MasterSheetResponse)
@router.get("/", response_model=MasterSheetResponse, include_in_schema=False)
async def get_master_sheet(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    month = get_safe_month(month)

    # 1. Fetch Mess
    mess_res = await db.execute(select(Mess).where(Mess.id == mess_id))
    mess = mess_res.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="মেস পাওয়া যায়নি")

    # 2. Date ranges
    year, m_num = map(int, month.split("-"))
    days_in_month = calendar.monthrange(year, m_num)[1]
    start_date = date(year, m_num, 1)
    end_date = date(year, m_num, days_in_month)

    # 3. Meals for the month
    stmt_meals = (
        select(Meal)
        .where(
            Meal.mess_id == mess_id,
            Meal.date >= start_date,
            Meal.date <= end_date,
        )
    )
    meals = (await db.execute(stmt_meals)).scalars().all()

    # 4. Bazars for the month (only approved entries count in calculations)
    stmt_bazars = (
        select(Bazar)
        .options(selectinload(Bazar.user))
        .where(
            Bazar.mess_id == mess_id,
            Bazar.date >= start_date,
            Bazar.date <= end_date,
            Bazar.status == BazarStatus.APPROVED,
        )
        .order_by(Bazar.date.asc(), Bazar.created_at.asc())
    )
    bazars = (await db.execute(stmt_bazars)).scalars().all()

    # 5. Deposits for the month (verified only)
    stmt_deposits = (
        select(Deposit)
        .where(
            Deposit.mess_id == mess_id,
            Deposit.date >= start_date,
            Deposit.date <= end_date,
            Deposit.is_verified == True,
        )
    )
    deposits = (await db.execute(stmt_deposits)).scalars().all()

    # 6. Fixed costs for the month
    stmt_fixed = (
        select(FixedCost)
        .where(
            FixedCost.mess_id == mess_id,
            FixedCost.month == month,
        )
        .order_by(FixedCost.created_at.asc())
    )
    fixed_costs = (await db.execute(stmt_fixed)).scalars().all()

    # 7. Memberships: include members who were active during this month or have month activity
    month_start_dt = datetime.combine(start_date, datetime.min.time())
    month_end_dt = datetime.combine(end_date, datetime.max.time())

    stmt_mem = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(
            Membership.mess_id == mess_id,
            Membership.joined_at <= month_end_dt,
            (Membership.left_at.is_(None) | (Membership.left_at >= month_start_dt)),
        )
        .order_by(Membership.joined_at.asc())
    )
    memberships = list((await db.execute(stmt_mem)).scalars().all())

    # Include any members who had activity (meals/bazar/deposit) in this month
    active_user_ids = {m.user_id for m in memberships}
    extra_user_ids = set()
    for m in meals:
        if m.user_id not in active_user_ids:
            extra_user_ids.add(m.user_id)
    for b in bazars:
        if b.user_id not in active_user_ids:
            extra_user_ids.add(b.user_id)
    for d in deposits:
        if d.user_id not in active_user_ids:
            extra_user_ids.add(d.user_id)

    if extra_user_ids:
        stmt_extra = (
            select(Membership)
            .options(selectinload(Membership.user))
            .where(
                Membership.mess_id == mess_id,
                Membership.user_id.in_(extra_user_ids),
            )
        )
        extra_mems = (await db.execute(stmt_extra)).scalars().all()
        for em in extra_mems:
            if em.user_id not in active_user_ids:
                memberships.append(em)
                active_user_ids.add(em.user_id)

    member_count = len(memberships)

    # Map meals by (user_id, day)
    user_day_meals = {}
    user_totals = {}
    daily_aggregates = {d: 0.0 for d in range(1, days_in_month + 1)}

    for m in meals:
        d = m.date.day
        t = m.total_meals
        if not m.is_off:
            user_day_meals[(m.user_id, d)] = t
            daily_aggregates[d] = round(daily_aggregates[d] + t, 2)
            
            if m.user_id not in user_totals:
                user_totals[m.user_id] = {
                    "brk": 0.0,
                    "lunch": 0.0,
                    "dinner": 0.0,
                    "guest": 0.0,
                    "total": 0.0,
                }
            user_totals[m.user_id]["brk"] += m.breakfast
            user_totals[m.user_id]["lunch"] += m.lunch
            user_totals[m.user_id]["dinner"] += m.dinner
            user_totals[m.user_id]["guest"] += (m.guest_breakfast + m.guest_lunch + m.guest_dinner)
            user_totals[m.user_id]["total"] += t

    # Map deposits by user_id
    user_deposits = {}
    for dep in deposits:
        user_deposits[dep.user_id] = user_deposits.get(dep.user_id, 0.0) + dep.amount

    # 8. Fetch month-specific rents if available
    rent_stmt = select(MemberMonthlyRent).where(
        MemberMonthlyRent.mess_id == mess_id,
        MemberMonthlyRent.month == month,
    )
    month_rents = {r.user_id: r for r in (await db.execute(rent_stmt)).scalars().all()}

    # Aggregate Bazar & Fixed Cost & Utilities
    total_bazar = round(sum(b.amount for b in bazars), 2)

    # Shared utilities vs individual rent
    shared_utilities = [fc for fc in fixed_costs if fc.category != FixedCostCategory.RENT]
    total_shared_utilities = round(sum(fc.amount for fc in shared_utilities), 2)

    # Count active residents for this month
    resident_count = len([m for m in memberships if month_rents.get(m.user_id, None) is None or month_rents[m.user_id].is_resident])
    if resident_count == 0:
        resident_count = member_count

    shared_utility_per_member = round(total_shared_utilities / resident_count, 2) if resident_count > 0 else 0.0

    total_individual_rent = round(
        sum(
            month_rents[m.user_id].total_rent if m.user_id in month_rents else m.rent_amount
            for m in memberships
        ),
        2,
    )
    fixed_cost_rent_sum = round(sum(fc.amount for fc in fixed_costs if fc.category == FixedCostCategory.RENT), 2)
    total_house_rent = total_individual_rent if total_individual_rent > 0 else fixed_cost_rent_sum

    total_fixed_cost = round(total_house_rent + total_shared_utilities, 2)
    fixed_cost_per_member = round(total_fixed_cost / member_count, 2) if member_count > 0 else 0.0
    total_deposits = round(sum(dep.amount for dep in deposits), 2)

    # Compute Total Meals & Meal Rate
    total_meals = round(sum(ut["total"] for ut in user_totals.values()), 2)
    meal_rate = round(total_bazar / total_meals, 2) if total_meals > 0 else 0.0

    # Build Member records
    member_list = []
    total_due = 0.0
    total_surplus = 0.0

    for mem_obj in memberships:
        uid = mem_obj.user_id
        uname = mem_obj.user.name if mem_obj.user else "সদস্য"
        uphone = mem_obj.user.phone if mem_obj.user else None
        
        ut = user_totals.get(uid, {"brk": 0.0, "lunch": 0.0, "dinner": 0.0, "guest": 0.0, "total": 0.0})
        m_total = round(ut["total"], 2)
        m_cost = round(m_total * meal_rate, 2)

        # Rent determination from MemberMonthlyRent
        m_rent_rec = month_rents.get(uid)
        if m_rent_rec:
            m_rent = m_rent_rec.total_rent
            is_res = m_rent_rec.is_resident
            seat_label_val = m_rent_rec.seat_label or mem_obj.seat_label
        elif mem_obj.rent_amount > 0:
            m_rent = mem_obj.rent_amount
            is_res = True
            seat_label_val = mem_obj.seat_label
        elif total_individual_rent == 0 and fixed_cost_rent_sum > 0 and member_count > 0:
            m_rent = round(fixed_cost_rent_sum / member_count, 2)
            is_res = True
            seat_label_val = mem_obj.seat_label
        else:
            m_rent = 0.0
            is_res = True
            seat_label_val = mem_obj.seat_label

        u_share = shared_utility_per_member if is_res else 0.0
        f_share = round(m_rent + u_share, 2)
        t_cost = round(m_cost + f_share, 2)
        u_dep = round(user_deposits.get(uid, 0.0), 2)
        bal = round(u_dep - t_cost, 2)

        if bal > 0.01:
            stat = "ফেরত পাবেন"
            total_surplus += bal
        elif bal < -0.01:
            stat = "বকেয়া"
            total_due += abs(bal)
        else:
            stat = "পরিশোধিত"

        # 31-day meal mapping
        daily_dict = {d: user_day_meals.get((uid, d), 0.0) for d in range(1, days_in_month + 1)}

        member_list.append(
            MasterSheetMember(
                user_id=uid,
                name=uname,
                phone=uphone,
                seat_label=seat_label_val,
                role=mem_obj.role.value if hasattr(mem_obj.role, "value") else str(mem_obj.role),
                rent_amount=round(m_rent, 2),
                shared_utility_share=shared_utility_per_member,
                daily_meals=daily_dict,
                total_breakfast=round(ut["brk"], 2),
                total_lunch=round(ut["lunch"], 2),
                total_dinner=round(ut["dinner"], 2),
                total_guest=round(ut["guest"], 2),
                total_meals=m_total,
                meal_cost=m_cost,
                fixed_cost_share=f_share,
                total_cost=t_cost,
                total_deposit=u_dep,
                balance=bal,
                status=stat,
            )
        )

    # Cash in hand (Drawer balance): Total deposits - Total bazar - Total fixed costs paid
    cash_in_hand = round(total_deposits - total_bazar - total_fixed_cost, 2)

    # Daily totals array
    daily_totals_list = [
        MasterSheetDailyTotal(
            day=d,
            date=f"{year:04d}-{m_num:02d}-{d:02d}",
            total_meals=daily_aggregates[d],
        )
        for d in range(1, days_in_month + 1)
    ]

    # Bazar items list
    bazar_list = [
        MasterSheetBazarItem(
            id=b.id,
            date=b.date.strftime("%Y-%m-%d"),
            user_id=b.user_id,
            user_name=b.user.name if b.user else "অন্যান্য",
            items=b.items,
            amount=b.amount,
        )
        for b in bazars
    ]

    # Fixed costs list
    fixed_list = [
        MasterSheetFixedCostItem(
            id=fc.id,
            category=fc.category.value if hasattr(fc.category, "value") else str(fc.category),
            title=fc.title,
            amount=fc.amount,
            split_type=fc.split_type.value if hasattr(fc.split_type, "value") else str(fc.split_type),
        )
        for fc in fixed_costs
    ]

    kpis = MasterSheetKPIs(
        total_meals=total_meals,
        total_bazar=total_bazar,
        meal_rate=meal_rate,
        total_deposits=total_deposits,
        total_fixed_cost=total_fixed_cost,
        total_house_rent=round(total_house_rent, 2),
        total_shared_utilities=round(total_shared_utilities, 2),
        fixed_cost_per_member=fixed_cost_per_member,
        shared_utility_per_member=shared_utility_per_member,
        cash_in_hand=cash_in_hand,
        total_due=round(total_due, 2),
        total_surplus=round(total_surplus, 2),
    )

    return MasterSheetResponse(
        mess_id=mess_id,
        mess_name=mess.name,
        month=month,
        days_in_month=days_in_month,
        kpis=kpis,
        members=member_list,
        daily_totals=daily_totals_list,
        bazars=bazar_list,
        fixed_costs=fixed_list,
    )

@router.get("/export-csv")
async def export_master_sheet_csv(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sheet: MasterSheetResponse = await get_master_sheet(mess_id, month, current_user, db)

    output = io.StringIO()
    # Write UTF-8 BOM so Excel opens Bangla characters natively
    output.write("\ufeff")
    writer = csv.writer(output)

    # 1. Header Information
    writer.writerow(["মেস মাস্টার শিট ও মাসিক অডিট বিবরণী"])
    writer.writerow(["মেসের নাম", sheet.mess_name])
    writer.writerow(["হিসাবের মাস", sheet.month])
    writer.writerow([])

    # 2. Key Performance Indicators
    writer.writerow(["সার্বিক আর্থিক সূচক (KPIs)"])
    writer.writerow(["মোট মিল", sheet.kpis.total_meals])
    writer.writerow(["মোট বাজার খরচ (টাকা)", sheet.kpis.total_bazar])
    writer.writerow(["মিল রেট (টাকা/মিল)", sheet.kpis.meal_rate])
    writer.writerow(["মোট সদস্য জমা (টাকা)", sheet.kpis.total_deposits])
    writer.writerow(["মোট ইউটিলিটি ও ফিক্সড কস্ট (টাকা)", sheet.kpis.total_fixed_cost])
    writer.writerow(["সদস্যপ্রতি ফিক্সড শেয়ার (টাকা)", sheet.kpis.fixed_cost_per_member])
    writer.writerow(["মেস ফান্ড অবশিষ্ট ক্যাশ (টাকা)", sheet.kpis.cash_in_hand])
    writer.writerow([])

    # 3. Individual Member Summary
    writer.writerow(["সদস্যভিত্তিক হিসাব ও ব্যালেন্স বিবরণী"])
    writer.writerow([
        "ক্রমিক",
        "সদস্যের নাম",
        "ফোন নম্বর",
        "আসন / রুম",
        "মোট মিল",
        "মিল বাবদ খরচ (টাকা)",
        "ফিক্সড চার্জ (টাকা)",
        "সর্বমোট খরচ (টাকা)",
        "জমা প্রদান (টাকা)",
        "অবশিষ্ট ব্যালেন্স (টাকা)",
        "স্ট্যাটাস",
    ])
    for idx, m in enumerate(sheet.members, start=1):
        status_txt = "বকেয়া আছে" if m.balance < 0 else "ফেরত পাবে" if m.balance > 0 else "পরিশোধিত"
        writer.writerow([
            idx,
            m.name,
            m.phone or "-",
            m.seat_label or "জেনারেল",
            m.total_meals,
            f"{m.meal_cost:.2f}",
            f"{m.fixed_cost_share:.2f}",
            f"{m.total_cost:.2f}",
            f"{m.total_deposit:.2f}",
            f"{m.balance:.2f}",
            status_txt,
        ])
    writer.writerow([])

    # 4. 31-Day Meal Grid
    days_header = ["ক্রমিক", "সদস্যের নাম"] + [f"{d} তারিখ" for d in range(1, sheet.days_in_month + 1)] + ["মোট মিল"]
    writer.writerow(["মাসিক ৩১ দিনের মিল ম্যাট্রিক্স"])
    writer.writerow(days_header)
    for idx, m in enumerate(sheet.members, start=1):
        day_meals = [m.daily_meals.get(d, 0.0) for d in range(1, sheet.days_in_month + 1)]
        writer.writerow([idx, m.name] + day_meals + [m.total_meals])
    
    # Daily Totals row
    daily_row: list = ["-", "দৈনিক মোট মিল"]
    daily_dict = {item.day: item.total_meals for item in sheet.daily_totals}
    for d in range(1, sheet.days_in_month + 1):
        daily_row.append(daily_dict.get(d, 0.0))
    daily_row.append(sheet.kpis.total_meals)
    writer.writerow(daily_row)
    writer.writerow([])

    # 5. Bazar Breakdown
    writer.writerow(["বাজারের বিস্তারিত খতিয়ান"])
    writer.writerow(["তারিখ", "বাজারকারী সদস্য", "আইটেম বিবরণী", "টাকা"])
    for b in sheet.bazars:
        writer.writerow([b.date, b.user_name, b.items or "-", f"{b.amount:.2f}"])
    writer.writerow([])

    # 6. Fixed Costs Breakdown
    writer.writerow(["ইউটিলিটি ও ফিক্সড কস্ট তালিকা"])
    writer.writerow(["বিভাগ", "বিবরণ", "টাকা", "বন্টন পদ্ধতি"])
    for fc in sheet.fixed_costs:
        writer.writerow([fc.category, fc.title, fc.amount, fc.split_type])

    output.seek(0)
    filename = f"mess_master_sheet_{sheet.month}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
