import uuid
from datetime import date as date_type, datetime, time as time_type, timedelta
from zoneinfo import ZoneInfo
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
from app.models.enums import BazarStatus
from app.core.deps import get_current_user, get_membership_for_mess, get_safe_month
from app.schemas.dashboard import (
    DashboardStats,
    MemberPersonalSummary,
    TodayMealDetail,
    SlotStatus,
)

router = APIRouter(prefix="/messes/{mess_id}/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardStats)
@router.get("/", response_model=DashboardStats, include_in_schema=False)
async def get_dashboard(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)

    today = date_type.today()
    month = get_safe_month(month)

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

    # Month Bazar (approved only)
    bazar_stmt = select(func.coalesce(func.sum(Bazar.amount), 0.0)).where(
        Bazar.mess_id == mess_id,
        Bazar.date >= start_date,
        Bazar.date < end_date,
        Bazar.status == BazarStatus.APPROVED,
    )
    month_total_bazar = float((await db.execute(bazar_stmt)).scalar() or 0.0)

    # Estimated meal rate
    if month_total_meals > 0:
        estimated_meal_rate = round(month_total_bazar / month_total_meals, 2)
    else:
        estimated_meal_rate = 0.0

    # Month Deposits (verified only)
    dep_stmt = select(func.coalesce(func.sum(Deposit.amount), 0.0)).where(
        Deposit.mess_id == mess_id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
        Deposit.is_verified == True,
    )
    month_total_deposit = float((await db.execute(dep_stmt)).scalar() or 0.0)

    # My Deposits (verified only)
    my_dep_stmt = select(func.coalesce(func.sum(Deposit.amount), 0.0)).where(
        Deposit.mess_id == mess_id,
        Deposit.user_id == current_user.id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
        Deposit.is_verified == True,
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

@router.get("/my-summary", response_model=MemberPersonalSummary)
async def get_member_personal_summary(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)

    today = date_type.today()
    month = get_safe_month(month)

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

    # Timezone-aware date & time in Asia/Dhaka
    tz = ZoneInfo("Asia/Dhaka")
    now_dhaka = datetime.now(tz)
    today = now_dhaka.date()
    tomorrow = today + timedelta(days=1)
    current_time = now_dhaka.time()

    rules = dict(mess.meal_rules or {
        "breakfast_unit": 0.5,
        "breakfast_cutoff_time": "22:00",
        "breakfast_cutoff_prev_day": True,
        "lunch_cutoff_time": "09:00",
        "dinner_cutoff_time": "17:00",
        "allow_guest_meals": True,
        "max_guest_per_meal": 3,
    })

    def parse_t(t_str, dh, dm):
        try:
            p = t_str.split(":")
            return time_type(int(p[0]), int(p[1]))
        except Exception:
            return time_type(dh, dm)

    b_cutoff_str = rules.get("breakfast_cutoff_time", "22:00")
    b_prev_day = rules.get("breakfast_cutoff_prev_day", True)
    l_cutoff_str = rules.get("lunch_cutoff_time", "09:00")
    d_cutoff_str = rules.get("dinner_cutoff_time", "17:00")

    b_time = parse_t(b_cutoff_str, 22, 0)
    l_time = parse_t(l_cutoff_str, 9, 0)
    d_time = parse_t(d_cutoff_str, 17, 0)

    # Today Breakfast Status
    if b_prev_day:
        today_b_open = False
        today_b_msg = f"সময় শেষ (গতকাল রাত {b_cutoff_str})"
    else:
        today_b_open = current_time < b_time
        today_b_msg = f"কাট-অফ: সকাল {b_cutoff_str}" if today_b_open else f"সময় শেষ (সকাল {b_cutoff_str})"

    # Today Lunch Status
    today_l_open = current_time < l_time
    today_l_msg = f"কাট-অফ: সকাল {l_cutoff_str}" if today_l_open else f"সময় শেষ (সকাল {l_cutoff_str})"

    # Today Dinner Status
    today_d_open = current_time < d_time
    today_d_msg = f"কাট-অফ: বিকাল {d_cutoff_str}" if today_d_open else f"সময় শেষ (বিকাল {d_cutoff_str})"

    # Today's meal for current user
    today_stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.user_id == current_user.id,
        Meal.date == today,
    )
    my_today_obj = (await db.execute(today_stmt)).scalar_one_or_none()

    today_detail = TodayMealDetail(
        date=str(today),
        breakfast=my_today_obj.breakfast if my_today_obj else 0.0,
        lunch=my_today_obj.lunch if my_today_obj else 0.0,
        dinner=my_today_obj.dinner if my_today_obj else 0.0,
        guest_breakfast=my_today_obj.guest_breakfast if my_today_obj else 0.0,
        guest_lunch=my_today_obj.guest_lunch if my_today_obj else 0.0,
        guest_dinner=my_today_obj.guest_dinner if my_today_obj else 0.0,
        is_off=my_today_obj.is_off if my_today_obj else False,
        total_meals=my_today_obj.total_meals if my_today_obj else 0.0,
        breakfast_status=SlotStatus(
            is_open=today_b_open,
            cutoff_time_str=b_cutoff_str,
            message=today_b_msg,
        ),
        lunch_status=SlotStatus(
            is_open=today_l_open,
            cutoff_time_str=l_cutoff_str,
            message=today_l_msg,
        ),
        dinner_status=SlotStatus(
            is_open=today_d_open,
            cutoff_time_str=d_cutoff_str,
            message=today_d_msg,
        ),
        dinner_cutoff_time=f"{d_cutoff_str} (বিকাল)",
        can_edit_dinner=today_d_open,
    )

    # Tomorrow's meal for advance planning
    tomorrow_stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.user_id == current_user.id,
        Meal.date == tomorrow,
    )
    my_tomorrow_obj = (await db.execute(tomorrow_stmt)).scalar_one_or_none()

    if b_prev_day:
        tomorrow_b_open = current_time < b_time
        tomorrow_b_msg = f"কাট-অফ: আজ রাত {b_cutoff_str}" if tomorrow_b_open else f"সময় শেষ (আজ রাত {b_cutoff_str})"
    else:
        tomorrow_b_open = True
        tomorrow_b_msg = f"কাট-অফ: কাল সকাল {b_cutoff_str}"

    tomorrow_detail = TodayMealDetail(
        date=str(tomorrow),
        breakfast=my_tomorrow_obj.breakfast if my_tomorrow_obj else 0.0,
        lunch=my_tomorrow_obj.lunch if my_tomorrow_obj else 0.0,
        dinner=my_tomorrow_obj.dinner if my_tomorrow_obj else 0.0,
        guest_breakfast=my_tomorrow_obj.guest_breakfast if my_tomorrow_obj else 0.0,
        guest_lunch=my_tomorrow_obj.guest_lunch if my_tomorrow_obj else 0.0,
        guest_dinner=my_tomorrow_obj.guest_dinner if my_tomorrow_obj else 0.0,
        is_off=my_tomorrow_obj.is_off if my_tomorrow_obj else False,
        total_meals=my_tomorrow_obj.total_meals if my_tomorrow_obj else 0.0,
        breakfast_status=SlotStatus(
            is_open=tomorrow_b_open,
            cutoff_time_str=b_cutoff_str,
            message=tomorrow_b_msg,
        ),
        lunch_status=SlotStatus(
            is_open=True,
            cutoff_time_str=l_cutoff_str,
            message=f"কাট-অফ: কাল সকাল {l_cutoff_str}",
        ),
        dinner_status=SlotStatus(
            is_open=True,
            cutoff_time_str=d_cutoff_str,
            message=f"কাট-অফ: কাল বিকাল {d_cutoff_str}",
        ),
        dinner_cutoff_time=f"{d_cutoff_str} (কাল বিকাল)",
        can_edit_dinner=True,
    )

    # Month meals
    month_meals_stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.date >= start_date,
        Meal.date < end_date,
    )
    all_month_meals = (await db.execute(month_meals_stmt)).scalars().all()
    mess_total_meals = sum(m.total_meals for m in all_month_meals)
    my_month_meals = sum(m.total_meals for m in all_month_meals if m.user_id == current_user.id)

    # Month Bazar (approved only)
    bazar_stmt = select(func.coalesce(func.sum(Bazar.amount), 0.0)).where(
        Bazar.mess_id == mess_id,
        Bazar.date >= start_date,
        Bazar.date < end_date,
        Bazar.status == BazarStatus.APPROVED,
    )
    mess_total_bazar = (await db.execute(bazar_stmt)).scalar() or 0.0

    # Meal rate
    estimated_meal_rate = (mess_total_bazar / mess_total_meals) if mess_total_meals > 0 else 0.0
    my_meal_cost = round(my_month_meals * estimated_meal_rate, 2)

    # Month Fixed Cost
    fixed_stmt = select(func.coalesce(func.sum(FixedCost.amount), 0.0)).where(
        FixedCost.mess_id == mess_id,
        FixedCost.month == month,
    )
    mess_total_fixed = (await db.execute(fixed_stmt)).scalar() or 0.0
    my_fixed_cost_share = round(mess_total_fixed / active_member_count, 2) if active_member_count > 0 else 0.0

    # Personal Deposits
    my_dep_stmt = (
        select(Deposit)
        .where(
            Deposit.mess_id == mess_id,
            Deposit.user_id == current_user.id,
            Deposit.date >= start_date,
            Deposit.date < end_date,
        )
        .order_by(Deposit.date.desc())
    )
    my_deposits_raw = (await db.execute(my_dep_stmt)).scalars().all()
    my_total_deposit = sum(d.amount for d in my_deposits_raw if d.is_verified)

    # Mess total deposit
    mess_dep_stmt = select(func.coalesce(func.sum(Deposit.amount), 0.0)).where(
        Deposit.mess_id == mess_id,
        Deposit.date >= start_date,
        Deposit.date < end_date,
        Deposit.is_verified == True,
    )
    mess_total_deposit = (await db.execute(mess_dep_stmt)).scalar() or 0.0

    total_personal_cost = round(my_meal_cost + my_fixed_cost_share, 2)
    net_balance = round(my_total_deposit - total_personal_cost, 2)

    # Formatted personal deposit items
    my_deposits = [
        {
            "id": str(d.id),
            "amount": d.amount,
            "date": str(d.date),
            "method": d.method.value if hasattr(d.method, "value") else str(d.method),
            "transaction_id": d.transaction_id,
            "is_verified": d.is_verified,
            "notes": d.notes,
        }
        for d in my_deposits_raw
    ]

    # Recent bazars for transparency (last 5)
    recent_bazar_stmt = (
        select(Bazar)
        .options(selectinload(Bazar.user))
        .where(Bazar.mess_id == mess_id)
        .order_by(Bazar.date.desc())
        .limit(5)
    )
    recent_bazars_raw = (await db.execute(recent_bazar_stmt)).scalars().all()
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

    return MemberPersonalSummary(
        mess_id=mess_id,
        mess_name=mess_name,
        user_id=current_user.id,
        user_name=current_user.name,
        phone=current_user.phone,
        seat_label=mem.seat_label,
        my_role=mem.role.value if hasattr(mem.role, "value") else str(mem.role),
        month=month,
        my_total_deposit=round(my_total_deposit, 2),
        my_month_meals=round(my_month_meals, 2),
        estimated_meal_rate=round(estimated_meal_rate, 2),
        my_meal_cost=my_meal_cost,
        my_fixed_cost_share=my_fixed_cost_share,
        total_personal_cost=total_personal_cost,
        net_balance=net_balance,
        mess_total_meals=round(mess_total_meals, 2),
        mess_total_bazar=round(mess_total_bazar, 2),
        mess_total_deposit=round(mess_total_deposit, 2),
        active_member_count=active_member_count,
        today=today_detail,
        tomorrow=tomorrow_detail,
        meal_rules=rules,
        my_deposits=my_deposits,
        recent_bazars=recent_bazars,
    )
