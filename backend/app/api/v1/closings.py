import uuid
from datetime import date as date_type, datetime
from typing import List, Optional
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
from app.models.closing import MonthlyClosing
from app.models.enums import MemberRole
from app.core.deps import get_current_user, get_membership_for_mess
from app.schemas.closing import (
    MemberClosingSummary,
    MonthlyClosingPreview,
    MonthlyClosingResponse,
)

router = APIRouter(prefix="/messes/{mess_id}/closings", tags=["Closings"])

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

    # 1. Active memberships
    mem_stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id)
        .order_by(Membership.joined_at.asc())
    )
    memberships = (await db.execute(mem_stmt)).scalars().all()
    member_count = len(memberships)
    if member_count == 0:
        raise HTTPException(status_code=400, detail="মেসে কোনো সক্রিয় মেম্বার নেই")

    # 2. Total Bazar
    bazar_stmt = select(func.coalesce(func.sum(Bazar.amount), 0.0)).where(
        Bazar.mess_id == mess_id,
        Bazar.date >= start_date,
        Bazar.date < end_date,
    )
    total_bazar = float((await db.execute(bazar_stmt)).scalar() or 0.0)

    # 3. Meals per member
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
            t = m.breakfast + m.lunch + m.dinner
            user_meals[m.user_id] = user_meals.get(m.user_id, 0.0) + t
            total_meals += t

    # 4. Meal Rate formula: Total Bazar / Total Meals
    if total_meals > 0:
        meal_rate = round(total_bazar / total_meals, 4)
    else:
        meal_rate = 0.0

    # 5. Fixed costs (rent, gas, electricity, wifi, maid, etc.)
    fc_stmt = select(func.coalesce(func.sum(FixedCost.amount), 0.0)).where(
        FixedCost.mess_id == mess_id,
        FixedCost.month == month,
    )
    total_fixed_cost = float((await db.execute(fc_stmt)).scalar() or 0.0)
    fixed_per_member = round(total_fixed_cost / member_count, 2) if member_count > 0 else 0.0

    # 6. Deposits per member
    dep_stmt = select(Deposit).where(
        Deposit.mess_id == mess_id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
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
        m_fixed_cost = fixed_per_member
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
                user_name=u.name if u else "Member",
                phone=u.phone if u else None,
                seat_label=m.seat_label,
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
        f"ফিক্সড খরচ জনপ্রতি = ৳{total_fixed_cost:.2f} ÷ {member_count} = ৳{fixed_per_member:.2f}"
    )

    return MonthlyClosingPreview(
        mess_id=mess_id,
        month=month,
        total_bazar=round(total_bazar, 2),
        total_meals=round(total_meals, 2),
        meal_rate=round(meal_rate, 2),
        total_fixed_cost=round(total_fixed_cost, 2),
        member_count=member_count,
        fixed_cost_per_member=fixed_per_member,
        members=members_summary,
        member_summaries=members_summary,
        is_closed=False,
        formula_explanation=formula_exp,
    )

@router.get("/preview", response_model=MonthlyClosingPreview)
async def preview_closing(
    mess_id: uuid.UUID,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
    return await calculate_monthly_closing_data(mess_id, month, db)

@router.get("/{month}", response_model=MonthlyClosingPreview)
async def get_or_preview_closing_month(
    mess_id: uuid.UUID,
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
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
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
