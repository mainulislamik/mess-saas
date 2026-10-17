import uuid
from datetime import date as date_type, datetime, timedelta
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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
from app.models.closing import MonthlyClosing
from app.models.enums import MemberRole, FixedCostCategory, BazarStatus
from app.core.deps import get_current_user, get_membership_for_mess, get_safe_month
from app.schemas.closing import (
    MemberClosingSummary,
    MonthlyClosingPreview,
    MonthlyClosingResponse,
)

router = APIRouter(prefix="/messes/{mess_id}/closings", tags=["Closings"])

async def check_month_not_closed(
    db: AsyncSession,
    mess_id: uuid.UUID,
    target_date_or_month: Union[date_type, datetime, str],
) -> None:
    """
    Prevents modifying transactions, meals, bazars, or costs if the month has been finalized/locked.
    """
    if isinstance(target_date_or_month, (date_type, datetime)):
        month_str = target_date_or_month.strftime("%Y-%m")
    else:
        month_str = str(target_date_or_month)[:7]

    stmt = select(MonthlyClosing).where(
        MonthlyClosing.mess_id == mess_id,
        MonthlyClosing.month == month_str,
        MonthlyClosing.is_closed == True,
    )
    closing = (await db.execute(stmt)).scalars().first()
    if closing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{month_str} মাসের হিসাব ক্লোজ (লক) করা হয়েছে। ক্লোজড মাসে কোনো পরিবর্তন বা এন্ট্রি করা যাবে না।",
        )

async def calculate_monthly_closing_data(
    mess_id: uuid.UUID,
    month: str,
    db: AsyncSession,
) -> MonthlyClosingPreview:
    year, m_num = map(int, month.split("-"))
    start_date = date_type(year, m_num, 1)
    if m_num == 12:
        end_date = date_type(year + 1, 1, 1)
    else:
        end_date = date_type(year, m_num + 1, 1)

    # 1. Total Bazar (only approved bazars)
    bazar_stmt = select(func.coalesce(func.sum(Bazar.amount), 0.0)).where(
        Bazar.mess_id == mess_id,
        Bazar.date >= start_date,
        Bazar.date < end_date,
        Bazar.status == BazarStatus.APPROVED,
    )
    total_bazar = float((await db.execute(bazar_stmt)).scalar() or 0.0)

    # 2. Meals per member
    meal_stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.date >= start_date,
        Meal.date < end_date,
    )
    meals = (await db.execute(meal_stmt)).scalars().all()

    user_meals: dict[uuid.UUID, float] = {}
    total_meals = 0.0
    for m in meals:
        if not m.is_off:
            t = m.total_meals
            user_meals[m.user_id] = user_meals.get(m.user_id, 0.0) + t
            total_meals += t

    # 3. Active memberships during this month or with activity
    month_start_dt = datetime.combine(start_date, datetime.min.time())
    month_end_dt = datetime.combine(end_date - timedelta(days=1), datetime.max.time())

    mem_stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(
            Membership.mess_id == mess_id,
            Membership.joined_at <= month_end_dt,
            (Membership.left_at.is_(None) | (Membership.left_at >= month_start_dt)),
        )
        .order_by(Membership.joined_at.asc())
    )
    memberships = list((await db.execute(mem_stmt)).scalars().all())

    # Ensure members who had meals in this month are included
    active_user_ids = {m.user_id for m in memberships}
    extra_user_ids = {m.user_id for m in meals if m.user_id not in active_user_ids}
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
    if member_count == 0:
        raise HTTPException(status_code=400, detail="মেসে কোনো সক্রিয় মেম্বার নেই")

    # 4. Meal Rate formula: Total Bazar / Total Meals
    if total_meals > 0:
        meal_rate = round(total_bazar / total_meals, 4)
    else:
        meal_rate = 0.0

    # 5. Fixed costs & shared utilities vs individual rent
    fc_stmt = select(FixedCost).where(
        FixedCost.mess_id == mess_id,
        FixedCost.month == month,
    )
    fixed_costs = (await db.execute(fc_stmt)).scalars().all()

    # Fetch month-specific rents if available
    rent_stmt = select(MemberMonthlyRent).where(
        MemberMonthlyRent.mess_id == mess_id,
        MemberMonthlyRent.month == month,
    )
    month_rents = {r.user_id: r for r in (await db.execute(rent_stmt)).scalars().all()}

    shared_utilities = [fc for fc in fixed_costs if fc.category != FixedCostCategory.RENT]
    total_shared_utilities = round(sum(fc.amount for fc in shared_utilities), 2)

    # Active residents count
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
    fixed_per_member = round(total_fixed_cost / member_count, 2) if member_count > 0 else 0.0

    # 6. Deposits per member (verified only)
    dep_stmt = select(Deposit).where(
        Deposit.mess_id == mess_id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
        Deposit.is_verified == True,
    )
    deposits = (await db.execute(dep_stmt)).scalars().all()
    user_deposits: dict[uuid.UUID, float] = {}
    for d in deposits:
        user_deposits[d.user_id] = user_deposits.get(d.user_id, 0.0) + d.amount

    # 7. Build individual breakdowns
    members_summary: List[MemberClosingSummary] = []
    for m in memberships:
        u = m.user
        m_meals = round(user_meals.get(m.user_id, 0.0), 2)
        m_meal_cost = round(m_meals * meal_rate, 2)

        # Rent determination from MemberMonthlyRent
        m_rent_rec = month_rents.get(m.user_id)
        if m_rent_rec:
            m_rent = m_rent_rec.total_rent
            is_res = m_rent_rec.is_resident
            seat_label_val = m_rent_rec.seat_label or m.seat_label
        elif m.rent_amount > 0:
            m_rent = m.rent_amount
            is_res = True
            seat_label_val = m.seat_label
        elif total_individual_rent == 0 and fixed_cost_rent_sum > 0 and member_count > 0:
            m_rent = round(fixed_cost_rent_sum / member_count, 2)
            is_res = True
            seat_label_val = m.seat_label
        else:
            m_rent = 0.0
            is_res = True
            seat_label_val = m.seat_label

        u_share = shared_utility_per_member if is_res else 0.0
        m_fixed_cost = round(m_rent + u_share, 2)
        m_total_cost = round(m_meal_cost + m_fixed_cost, 2)
        m_deposit = round(user_deposits.get(m.user_id, 0.0), 2)
        m_balance = round(m_deposit - m_total_cost, 2)

        if m_balance < -0.01:
            status_text = "বাকি"
        elif m_balance > 0.01:
            status_text = "ফেরত"
        else:
            status_text = "পরিশোধিত"

        members_summary.append(
            MemberClosingSummary(
                user_id=m.user_id,
                user_name=u.name if u else "সদস্য",
                phone=u.phone if u else None,
                seat_label=seat_label_val,
                rent_amount=round(m_rent, 2),
                shared_utility_share=shared_utility_per_member,
                total_meals=m_meals,
                meal_rate=round(meal_rate, 2),
                meal_cost=m_meal_cost,
                fixed_cost=m_fixed_cost,
                total_cost=m_total_cost,
                total_deposit=m_deposit,
                balance=m_balance,
                status=status_text,
            )
        )

    formula_exp = (
        f"মিল রেট = মোট বাজার (৳{total_bazar:.2f}) ÷ মোট মিল ({total_meals:.2f}) = ৳{meal_rate:.2f} | "
        f"শেয়ার্ড ইউটিলিটি জনপ্রতি = ৳{total_shared_utilities:.2f} ÷ {member_count} = ৳{shared_utility_per_member:.2f} | "
        f"মোট বাড়িভাড়া = ৳{total_house_rent:.2f}"
    )

    return MonthlyClosingPreview(
        mess_id=mess_id,
        month=month,
        total_bazar=round(total_bazar, 2),
        total_meals=round(total_meals, 2),
        meal_rate=round(meal_rate, 2),
        total_fixed_cost=round(total_fixed_cost, 2),
        total_house_rent=round(total_house_rent, 2),
        total_shared_utilities=round(total_shared_utilities, 2),
        member_count=member_count,
        fixed_cost_per_member=fixed_per_member,
        shared_utility_per_member=shared_utility_per_member,
        members=members_summary,
        member_summaries=members_summary,
        is_closed=False,
        formula_explanation=formula_exp,
    )

@router.get("/preview", response_model=MonthlyClosingPreview)
async def preview_closing(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
    month = get_safe_month(month)
    return await calculate_monthly_closing_data(mess_id, month, db)

@router.get("/{month}", response_model=MonthlyClosingPreview)
async def get_or_preview_closing_month(
    mess_id: uuid.UUID,
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
    month = get_safe_month(month)
    # Check if finalized
    stmt = select(MonthlyClosing).where(
        MonthlyClosing.mess_id == mess_id,
        MonthlyClosing.month == month,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    preview = await calculate_monthly_closing_data(mess_id, month, db)
    if existing:
        preview.is_closed = existing.is_closed
    return preview

@router.post("/{month}/finalize", response_model=MonthlyClosingResponse)
async def finalize_closing_by_path(
    mess_id: uuid.UUID,
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await finalize_closing(mess_id=mess_id, month=month, current_user=current_user, db=db)

@router.post("", response_model=MonthlyClosingResponse)
@router.post("/", response_model=MonthlyClosingResponse, include_in_schema=False)
async def finalize_closing(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can finalize monthly closing",
        )

    preview = await calculate_monthly_closing_data(mess_id, month, db)

    # Check if closing exists
    stmt = select(MonthlyClosing).where(
        MonthlyClosing.mess_id == mess_id,
        MonthlyClosing.month == month,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()

    summary_dict = preview.model_dump(mode="json")

    if existing:
        existing.total_bazar = preview.total_bazar
        existing.total_meals = preview.total_meals
        existing.meal_rate = preview.meal_rate
        existing.total_fixed_cost = preview.total_fixed_cost
        existing.member_count = preview.member_count
        existing.fixed_cost_per_member = preview.fixed_cost_per_member
        existing.summary_data = summary_dict
        existing.is_closed = True
        existing.closed_by = current_user.id
        existing.closed_at = datetime.utcnow()
        closing = existing
    else:
        closing = MonthlyClosing(
            mess_id=mess_id,
            month=month,
            total_bazar=preview.total_bazar,
            total_meals=preview.total_meals,
            meal_rate=preview.meal_rate,
            total_fixed_cost=preview.total_fixed_cost,
            member_count=preview.member_count,
            fixed_cost_per_member=preview.fixed_cost_per_member,
            summary_data=summary_dict,
            is_closed=True,
            closed_by=current_user.id,
            closed_at=datetime.utcnow(),
        )
        db.add(closing)

    await db.commit()
    await db.refresh(closing)
    return closing

@router.post("/{month}/reopen", response_model=MonthlyClosingResponse)
async def reopen_closing(
    mess_id: uuid.UUID,
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can reopen monthly closing",
        )
    stmt = select(MonthlyClosing).where(
        MonthlyClosing.mess_id == mess_id,
        MonthlyClosing.month == month,
    )
    closing = (await db.execute(stmt)).scalar_one_or_none()
    if not closing:
        raise HTTPException(status_code=404, detail="এই মাসের কোনো ক্লোজিং ডাটা পাওয়া যায়নি")
    closing.is_closed = False
    await db.commit()
    await db.refresh(closing)
    return closing

