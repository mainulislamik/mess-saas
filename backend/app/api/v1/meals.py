import uuid
from datetime import date as date_type, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.membership import Membership
from app.models.meal import Meal
from app.models.enums import MemberRole
from app.core.deps import get_current_user, get_membership_for_mess
from app.schemas.meal import (
    MealBatchUpdate,
    MealSelfUpdate,
    MealResponse,
    MemberMealSummary,
    DailyMealMatrix,
)

router = APIRouter(prefix="/messes/{mess_id}/meals", tags=["Meals"])

@router.get("", response_model=DailyMealMatrix)
@router.get("/", response_model=DailyMealMatrix, include_in_schema=False)
async def get_daily_meals(
    mess_id: uuid.UUID,
    date: date_type = Query(default_factory=date_type.today),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)

    # Fetch active members of this mess
    mem_stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id)
        .order_by(Membership.joined_at.asc())
    )
    mem_res = await db.execute(mem_stmt)
    memberships = mem_res.scalars().all()

    # Fetch existing meals for this date
    meal_stmt = select(Meal).where(Meal.mess_id == mess_id, Meal.date == date)
    meal_res = await db.execute(meal_stmt)
    existing_meals = {m.user_id: m for m in meal_res.scalars().all()}

    results = []
    total_day_meals = 0.0

    for m in memberships:
        user = m.user
        meal_entry = existing_meals.get(m.user_id)
        if meal_entry:
            t = meal_entry.total_meals
            total_day_meals += t
            results.append(
                MealResponse(
                    id=meal_entry.id,
                    mess_id=mess_id,
                    user_id=m.user_id,
                    date=date,
                    breakfast=meal_entry.breakfast,
                    lunch=meal_entry.lunch,
                    dinner=meal_entry.dinner,
                    is_off=meal_entry.is_off,
                    notes=meal_entry.notes,
                    total_meals=t,
                    user_name=user.name if user else "Member",
                    created_at=meal_entry.created_at,
                )
            )
        else:
            # Default meal entry if not yet recorded (0 brk, 1 lunch, 1 dinner = 2 meals)
            results.append(
                MealResponse(
                    id=uuid.uuid4(),
                    mess_id=mess_id,
                    user_id=m.user_id,
                    date=date,
                    breakfast=0.0,
                    lunch=1.0,
                    dinner=1.0,
                    is_off=False,
                    notes=None,
                    total_meals=2.0,
                    user_name=user.name if user else "Member",
                    created_at=datetime.utcnow(),
                )
            )
            total_day_meals += 2.0

    return DailyMealMatrix(
        date=date,
        total_day_meals=round(total_day_meals, 2),
        members=results,
    )

@router.get("/monthly", response_model=List[MemberMealSummary])
async def get_monthly_meal_summary(
    mess_id: uuid.UUID,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)

    year, m_num = map(int, month.split("-"))
    start_date = date_type(year, m_num, 1)
    # End date: next month first day
    if m_num == 12:
        end_date = date_type(year + 1, 1, 1)
    else:
        end_date = date_type(year, m_num + 1, 1)

    mem_stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id)
        .order_by(Membership.joined_at.asc())
    )
    memberships = (await db.execute(mem_stmt)).scalars().all()

    # Query all meals in month for this mess
    meals_stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.date >= start_date,
        Meal.date < end_date,
    )
    meals = (await db.execute(meals_stmt)).scalars().all()

    # Aggregate per user
    user_totals = {}
    for m in meals:
        if m.user_id not in user_totals:
            user_totals[m.user_id] = {"brk": 0.0, "lunch": 0.0, "dinner": 0.0, "total": 0.0}
        if not m.is_off:
            user_totals[m.user_id]["brk"] += m.breakfast
            user_totals[m.user_id]["lunch"] += m.lunch
            user_totals[m.user_id]["dinner"] += m.dinner
            user_totals[m.user_id]["total"] += (m.breakfast + m.lunch + m.dinner)

    summary = []
    for m in memberships:
        u = m.user
        tot = user_totals.get(m.user_id, {"brk": 0.0, "lunch": 0.0, "dinner": 0.0, "total": 0.0})
        summary.append(
            MemberMealSummary(
                user_id=m.user_id,
                user_name=u.name if u else "Member",
                phone=u.phone if u else None,
                seat_label=m.seat_label,
                breakfast_count=round(tot["brk"], 2),
                lunch_count=round(tot["lunch"], 2),
                dinner_count=round(tot["dinner"], 2),
                total_meals=round(tot["total"], 2),
            )
        )

    return summary

@router.post("/batch")
async def batch_update_meals(
    mess_id: uuid.UUID,
    data: MealBatchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can batch update meals",
        )

    for item in data.meals:
        # Check if meal exists for user and date
        stmt = select(Meal).where(
            Meal.mess_id == mess_id,
            Meal.user_id == item.user_id,
            Meal.date == data.date,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.breakfast = item.breakfast
            existing.lunch = item.lunch
            existing.dinner = item.dinner
            existing.is_off = item.is_off
            existing.notes = item.notes
        else:
            new_meal = Meal(
                mess_id=mess_id,
                user_id=item.user_id,
                date=data.date,
                breakfast=item.breakfast,
                lunch=item.lunch,
                dinner=item.dinner,
                is_off=item.is_off,
                notes=item.notes,
            )
            db.add(new_meal)

    await db.commit()
    return {"message": "Meals updated successfully", "count": len(data.meals)}

@router.post("/me")
async def update_my_meal(
    mess_id: uuid.UUID,
    data: MealSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)

    stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.user_id == current_user.id,
        Meal.date == data.date,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.breakfast = data.breakfast
        existing.lunch = data.lunch
        existing.dinner = data.dinner
        existing.is_off = data.is_off
        existing.notes = data.notes
    else:
        new_meal = Meal(
            mess_id=mess_id,
            user_id=current_user.id,
            date=data.date,
            breakfast=data.breakfast,
            lunch=data.lunch,
            dinner=data.dinner,
            is_off=data.is_off,
            notes=data.notes,
        )
        db.add(new_meal)

    await db.commit()
    return {"message": "Your meal preference was updated successfully"}
