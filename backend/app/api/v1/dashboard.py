import uuid
from datetime import date as date_type, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
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
from app.core.deps import get_current_user, get_membership_for_mess
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/messes/{mess_id}/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardStats)
@router.get("/", response_model=DashboardStats, include_in_schema=False)
async def get_dashboard(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)

    today = date_type.today()
    if not month:
        month = f"{today.year:04d}-{today.month:02d}"

    year, m_num = map(int, month.split("-"))
    start_date = date_type(year, m_num, 1)
    if m_num == 12:
        end_date = date_type(year + 1, 1, 1)
    else:
        end_date = date_type(year, m_num + 1, 1)

    # Mess details
    mess_stmt = select(Mess).where(Mess.id == mess_id)
    mess = (await db.execute(mess_stmt)).scalar_one_or_none()
    mess_name = mess.name if mess else "My Mess"

    # Active member count
    mem_stmt = select(func.count(Membership.id)).where(Membership.mess_id == mess_id)
    active_member_count = (await db.execute(mem_stmt)).scalar() or 1

    # Today's meals
    today_stmt = select(Meal).where(Meal.mess_id == mess_id, Meal.date == today)
    today_meals = (await db.execute(today_stmt)).scalars().all()
    today_total = sum(m.total_meals for m in today_meals)
    my_today_meal = next((m.total_meals for m in today_meals if m.user_id == current_user.id), 0.0)

    # Month meals
    month_meals_stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.date >= start_date,
        Meal.date < end_date,
    )
    all_month_meals = (await db.execute(month_meals_stmt)).scalars().all()
    month_total_meals = sum(m.total_meals for m in all_month_meals)
    my_month_meals = sum(m.total_meals for m in all_month_meals if m.user_id == current_user.id)

    # Month Bazar
    bazar_stmt = select(func.coalesce(func.sum(Bazar.amount), 0.0)).where(
        Bazar.mess_id == mess_id,
        Bazar.date >= start_date,
        Bazar.date < end_date,
    )
    month_total_bazar = float((await db.execute(bazar_stmt)).scalar() or 0.0)

    # Estimated meal rate
    if month_total_meals > 0:
        estimated_meal_rate = round(month_total_bazar / month_total_meals, 2)
    else:
        estimated_meal_rate = 0.0

    # Month Deposits
    dep_stmt = select(func.coalesce(func.sum(Deposit.amount), 0.0)).where(
        Deposit.mess_id == mess_id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
    )
    month_total_deposit = float((await db.execute(dep_stmt)).scalar() or 0.0)

    # My Deposits
    my_dep_stmt = select(func.coalesce(func.sum(Deposit.amount), 0.0)).where(
        Deposit.mess_id == mess_id,
        Deposit.user_id == current_user.id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
    )
    my_total_deposit = float((await db.execute(my_dep_stmt)).scalar() or 0.0)

    # Fixed costs
    fc_stmt = select(func.coalesce(func.sum(FixedCost.amount), 0.0)).where(
        FixedCost.mess_id == mess_id,
        FixedCost.month == month,
    )
    month_total_fixed_cost = float((await db.execute(fc_stmt)).scalar() or 0.0)
    my_fixed_cost_share = round(month_total_fixed_cost / active_member_count, 2)

    my_estimated_meal_cost = round(my_month_meals * estimated_meal_rate, 2)
    my_balance = round(my_total_deposit - (my_estimated_meal_cost + my_fixed_cost_share), 2)

    # Recent bazars (last 5)
    rec_bazar_stmt = (
        select(Bazar)
        .options(selectinload(Bazar.user))
        .where(Bazar.mess_id == mess_id)
        .order_by(Bazar.date.desc(), Bazar.created_at.desc())
        .limit(5)
    )
    recent_bazars_raw = (await db.execute(rec_bazar_stmt)).scalars().all()
    recent_bazars = [
        {
            "id": str(b.id),
            "user_name": b.user.name if b.user else "Member",
            "date": str(b.date),
            "amount": b.amount,
            "items": b.items,
        }
        for b in recent_bazars_raw
    ]

    # Recent deposits (last 5)
    rec_dep_stmt = (
        select(Deposit)
        .options(selectinload(Deposit.user))
        .where(Deposit.mess_id == mess_id)
        .order_by(Deposit.date.desc(), Deposit.created_at.desc())
        .limit(5)
    )
    recent_deposits_raw = (await db.execute(rec_dep_stmt)).scalars().all()
    recent_deposits = [
        {
            "id": str(d.id),
            "user_name": d.user.name if d.user else "Member",
            "date": str(d.date),
            "amount": d.amount,
            "method": d.method.value if hasattr(d.method, "value") else str(d.method),
        }
        for d in recent_deposits_raw
    ]

    return DashboardStats(
        mess_id=mess_id,
        mess_name=mess_name,
        my_role=mem.role.value if hasattr(mem.role, "value") else str(mem.role),
        month=month,
        today_date=str(today),
        today_total_meals=round(today_total, 2),
        today_my_meals=round(my_today_meal, 2),
        month_total_meals=round(month_total_meals, 2),
        month_total_bazar=round(month_total_bazar, 2),
        month_total_deposit=round(month_total_deposit, 2),
        month_total_fixed_cost=round(month_total_fixed_cost, 2),
        estimated_meal_rate=round(estimated_meal_rate, 2),
        my_month_meals=round(my_month_meals, 2),
        my_estimated_meal_cost=my_estimated_meal_cost,
        my_fixed_cost_share=my_fixed_cost_share,
        my_total_deposit=my_total_deposit,
        my_balance=my_balance,
        active_member_count=active_member_count,
        recent_bazars=recent_bazars,
        recent_deposits=recent_deposits,
    )
