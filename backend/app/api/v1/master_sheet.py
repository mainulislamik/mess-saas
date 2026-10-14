import uuid
import calendar
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
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

    # 3. Memberships
    stmt_mem = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id, Membership.left_at.is_(None))
        .order_by(Membership.joined_at.asc())
    )
    memberships = (await db.execute(stmt_mem)).scalars().all()
    member_count = len(memberships)

    # 4. Meals for the month
    stmt_meals = (
        select(Meal)
        .where(
            Meal.mess_id == mess_id,
            Meal.date >= start_date,
            Meal.date <= end_date,
        )
    )
    meals = (await db.execute(stmt_meals)).scalars().all()

    # 5. Bazars for the month
    stmt_bazars = (
        select(Bazar)
        .options(selectinload(Bazar.user))
        .where(
            Bazar.mess_id == mess_id,
            Bazar.date >= start_date,
            Bazar.date <= end_date,
        )
        .order_by(Bazar.date.asc(), Bazar.created_at.asc())
    )
    bazars = (await db.execute(stmt_bazars)).scalars().all()

    # 6. Deposits for the month
    stmt_deposits = (
        select(Deposit)
        .where(
            Deposit.mess_id == mess_id,
            Deposit.date >= start_date,
            Deposit.date <= end_date,
        )
    )
    deposits = (await db.execute(stmt_deposits)).scalars().all()

    # 7. Fixed costs for the month
    stmt_fixed = (
        select(FixedCost)
        .where(
            FixedCost.mess_id == mess_id,
            FixedCost.month == month,
        )
        .order_by(FixedCost.created_at.asc())
    )
    fixed_costs = (await db.execute(stmt_fixed)).scalars().all()

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

    # Aggregate Bazar & Fixed Cost
    total_bazar = round(sum(b.amount for b in bazars), 2)
    total_fixed_cost = round(sum(fc.amount for fc in fixed_costs), 2)
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
        f_share = fixed_cost_per_member
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
                seat_label=mem_obj.seat_label,
                role=mem_obj.role.value if hasattr(mem_obj.role, "value") else str(mem_obj.role),
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
        fixed_cost_per_member=fixed_cost_per_member,
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
