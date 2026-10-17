import uuid
from datetime import date as date_type, datetime, time as time_type, timedelta
from zoneinfo import ZoneInfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.meal import Meal
from app.models.enums import MemberRole
from app.core.deps import get_current_user, get_membership_for_mess, get_safe_month
from app.schemas.meal import (
    MealBatchUpdate,
    MealSelfUpdate,
    MealResponse,
    MemberMealSummary,
    DailyMealMatrix,
    MealEmergencyVoidRequest,
    MealEmergencyVoidResponse,
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
            # Default meal entry if not yet recorded (0 meals, normal unchecked state)
            results.append(
                MealResponse(
                    id=uuid.uuid4(),
                    mess_id=mess_id,
                    user_id=m.user_id,
                    date=date,
                    breakfast=0.0,
                    lunch=0.0,
                    dinner=0.0,
                    guest_breakfast=0.0,
                    guest_lunch=0.0,
                    guest_dinner=0.0,
                    is_off=False,
                    notes=None,
                    total_meals=0.0,
                    user_name=user.name if user else "Member",
                    created_at=datetime.utcnow(),
                )
            )

    return DailyMealMatrix(
        date=date,
        total_day_meals=round(total_day_meals, 2),
        members=results,
    )

@router.get("/monthly", response_model=List[MemberMealSummary])
async def get_monthly_meal_summary(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None, description="Month in YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
    month = get_safe_month(month)

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
            user_totals[m.user_id] = {"brk": 0.0, "lunch": 0.0, "dinner": 0.0, "guest": 0.0, "total": 0.0}
        if not m.is_off:
            user_totals[m.user_id]["brk"] += m.breakfast
            user_totals[m.user_id]["lunch"] += m.lunch
            user_totals[m.user_id]["dinner"] += m.dinner
            user_totals[m.user_id]["guest"] += (m.guest_breakfast + m.guest_lunch + m.guest_dinner)
            user_totals[m.user_id]["total"] += m.total_meals

    summary = []
    for m in memberships:
        u = m.user
        tot = user_totals.get(m.user_id, {"brk": 0.0, "lunch": 0.0, "dinner": 0.0, "guest": 0.0, "total": 0.0})
        summary.append(
            MemberMealSummary(
                user_id=m.user_id,
                user_name=u.name if u else "Member",
                phone=u.phone if u else None,
                seat_label=m.seat_label,
                breakfast_count=round(tot["brk"], 2),
                lunch_count=round(tot["lunch"], 2),
                dinner_count=round(tot["dinner"], 2),
                guest_meals=round(tot["guest"], 2),
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
            existing.guest_breakfast = item.guest_breakfast
            existing.guest_lunch = item.guest_lunch
            existing.guest_dinner = item.guest_dinner
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
                guest_breakfast=item.guest_breakfast,
                guest_lunch=item.guest_lunch,
                guest_dinner=item.guest_dinner,
                is_off=item.is_off,
                notes=item.notes,
            )
            db.add(new_meal)

    await db.commit()
    return {"message": "Meals updated successfully", "count": len(data.meals)}

@router.post("/emergency-slot-void", response_model=MealEmergencyVoidResponse)
async def emergency_slot_void(
    mess_id: uuid.UUID,
    payload: MealEmergencyVoidRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Manager or Owner can perform emergency meal slot cancellation",
        )

    REASON_MAP = {
        "bua_absent": "খালা/বুয়া আসেনি",
        "no_gas": "গ্যাস সংকট / সিলিন্ডার শেষ",
        "water_issue": "পানি বা বিদ্যুৎ সংকট",
        "custom": payload.custom_reason or "বিশেষ কারণে রান্না হয়নি",
    }
    reason_label = REASON_MAP.get(payload.reason, payload.custom_reason or "রান্না হয়নি")

    SLOT_LABEL_MAP = {
        "breakfast": "সকালের নাস্তা",
        "lunch": "দুপুরের খাবার",
        "dinner": "রাতের খাবার",
        "all": "সারাদিনের সকল খাবার",
    }
    slot_label = SLOT_LABEL_MAP.get(payload.slot, payload.slot)

    # Fetch active members of mess
    mem_stmt = select(Membership).where(Membership.mess_id == mess_id)
    memberships = (await db.execute(mem_stmt)).scalars().all()
    user_ids = [m.user_id for m in memberships]

    # Fetch existing meals for date
    meal_stmt = select(Meal).where(Meal.mess_id == mess_id, Meal.date == payload.date)
    existing_meals = (await db.execute(meal_stmt)).scalars().all()
    existing_map = {m.user_id: m for m in existing_meals}

    affected_count = 0
    note_text = f"রান্না বন্ধ ({reason_label})" if payload.action == "zero_out" else f"হোটেল খাবার ({reason_label})"

    for uid in user_ids:
        meal_obj = existing_map.get(uid)
        if not meal_obj:
            meal_obj = Meal(
                mess_id=mess_id,
                user_id=uid,
                date=payload.date,
                breakfast=0.0,
                lunch=0.0,
                dinner=0.0,
                guest_breakfast=0.0,
                guest_lunch=0.0,
                guest_dinner=0.0,
                is_off=True,
                notes=note_text,
            )
            db.add(meal_obj)
        else:
            if payload.action == "zero_out":
                if payload.slot == "breakfast":
                    meal_obj.breakfast = 0.0
                    meal_obj.guest_breakfast = 0.0
                elif payload.slot == "lunch":
                    meal_obj.lunch = 0.0
                    meal_obj.guest_lunch = 0.0
                elif payload.slot == "dinner":
                    meal_obj.dinner = 0.0
                    meal_obj.guest_dinner = 0.0
                elif payload.slot == "all":
                    meal_obj.breakfast = 0.0
                    meal_obj.lunch = 0.0
                    meal_obj.dinner = 0.0
                    meal_obj.guest_breakfast = 0.0
                    meal_obj.guest_lunch = 0.0
                    meal_obj.guest_dinner = 0.0
                    meal_obj.is_off = True

                if (
                    meal_obj.breakfast == 0
                    and meal_obj.lunch == 0
                    and meal_obj.dinner == 0
                    and meal_obj.guest_breakfast == 0
                    and meal_obj.guest_lunch == 0
                    and meal_obj.guest_dinner == 0
                ):
                    meal_obj.is_off = True

                meal_obj.notes = (
                    f"{meal_obj.notes}; {note_text}" if meal_obj.notes and note_text not in meal_obj.notes else note_text
                )
            else:
                meal_obj.notes = (
                    f"{meal_obj.notes}; {note_text}" if meal_obj.notes and note_text not in meal_obj.notes else note_text
                )

        affected_count += 1

    await db.commit()

    action_msg = (
        f"{payload.date} তারিখের {slot_label} বাতিল করে সব মেম্বারের মিল ০.০ করা হয়েছে ({reason_label})"
        if payload.action == "zero_out"
        else f"{payload.date} তারিখের {slot_label} হোটেল খাবার হিসেবে চিহ্নিত করা হয়েছে ({reason_label})"
    )

    return MealEmergencyVoidResponse(
        date=payload.date,
        slot=payload.slot,
        action=payload.action,
        reason_text=reason_label,
        affected_members_count=affected_count,
        message=action_msg,
    )

def parse_time_str(val: str, default_hour: int, default_min: int) -> time_type:
    try:
        parts = val.split(":")
        return time_type(int(parts[0]), int(parts[1]))
    except Exception:
        return time_type(default_hour, default_min)

@router.post("/me")
async def update_my_meal(
    mess_id: uuid.UUID,
    data: MealSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)

    # Fetch Mess for rules
    mess = (await db.execute(select(Mess).where(Mess.id == mess_id))).scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="মেস পাওয়া যায়নি")

    meal_rules = mess.meal_rules or {
        "breakfast_unit": 0.5,
        "breakfast_cutoff_time": "22:00",
        "breakfast_cutoff_prev_day": True,
        "lunch_cutoff_time": "09:00",
        "dinner_cutoff_time": "17:00",
        "allow_guest_meals": True,
        "max_guest_per_meal": 3,
    }

    # Timezone-aware validation in Asia/Dhaka
    tz = ZoneInfo("Asia/Dhaka")
    now_dhaka = datetime.now(tz)
    today_dhaka = now_dhaka.date()
    tomorrow_dhaka = today_dhaka + timedelta(days=1)
    current_time = now_dhaka.time()

    is_manager = mem.role in [MemberRole.OWNER, MemberRole.MANAGER]

    # Non-managers have strict cutoff limits
    if not is_manager:
        if data.date < today_dhaka:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="অতীতের তারিখের মিল পরিবর্তন করার অনুমতি নেই।",
            )
        if data.date > tomorrow_dhaka:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="শুধুমাত্র আজকের ও আগামীকালের অগ্রিম মিল পরিবর্তন করা যাবে।",
            )

        # Guest meal quota check
        total_guest = data.guest_breakfast + data.guest_lunch + data.guest_dinner
        allow_guest = meal_rules.get("allow_guest_meals", True)
        max_guest = int(meal_rules.get("max_guest_per_meal", 3))

        if total_guest > 0:
            if not allow_guest:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="এই মেসে সাধারণ সদস্যদের জন্য মেহমান/গেস্ট মিল অনুমোদন নেই।",
                )
            if (
                data.guest_breakfast > max_guest
                or data.guest_lunch > max_guest
                or data.guest_dinner > max_guest
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"প্রতি বেলায় সর্বোচ্চ {max_guest} টি মেহমান মিল দেওয়া যাবে।",
                )

    stmt = select(Meal).where(
        Meal.mess_id == mess_id,
        Meal.user_id == current_user.id,
        Meal.date == data.date,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()

    # Enforce Cutoffs for non-managers
    if not is_manager:
        old_b = existing.breakfast if existing else 0.0
        old_gb = existing.guest_breakfast if existing else 0.0
        old_l = existing.lunch if existing else 0.0
        old_gl = existing.guest_lunch if existing else 0.0
        old_d = existing.dinner if existing else 0.0
        old_gd = existing.guest_dinner if existing else 0.0

        b_cutoff_str = meal_rules.get("breakfast_cutoff_time", "22:00")
        b_prev_day = meal_rules.get("breakfast_cutoff_prev_day", True)
        l_cutoff_str = meal_rules.get("lunch_cutoff_time", "09:00")
        d_cutoff_str = meal_rules.get("dinner_cutoff_time", "17:00")

        b_cutoff_time = parse_time_str(b_cutoff_str, 22, 0)
        l_cutoff_time = parse_time_str(l_cutoff_str, 9, 0)
        d_cutoff_time = parse_time_str(d_cutoff_str, 17, 0)

        # Breakfast Cutoff Check
        if (data.breakfast != old_b) or (data.guest_breakfast != old_gb):
            if data.date == today_dhaka:
                if b_prev_day:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"আজকের সকালের নাস্তার কাট-অফ সময় (গতকাল রাত {b_cutoff_str}) পার হয়ে গেছে। পরিবর্তনের জন্য মেস ম্যানেজারের সাথে যোগাযোগ করুন।",
                    )
                else:
                    if current_time >= b_cutoff_time:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"আজকের সকালের নাস্তার কাট-অফ সময় (সকাল {b_cutoff_str}) পার হয়ে গেছে।",
                        )
            elif data.date == tomorrow_dhaka:
                if b_prev_day:
                    if current_time >= b_cutoff_time:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"আগামীকালের সকালের নাস্তার কাট-অফ সময় (আজ রাত {b_cutoff_str}) পার হয়ে গেছে। পরিবর্তনের জন্য ম্যানেজারের সাথে যোগাযোগ করুন।",
                        )

        # Lunch Cutoff Check
        if (data.lunch != old_l) or (data.guest_lunch != old_gl):
            if data.date == today_dhaka:
                if current_time >= l_cutoff_time:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"আজকের দুপুরের খাবারের কাট-অফ সময় (সকাল {l_cutoff_str}) পার হয়ে গেছে। পরিবর্তনের জন্য ম্যানেজারের সাথে যোগাযোগ করুন।",
                    )

        # Dinner Cutoff Check
        if (data.dinner != old_d) or (data.guest_dinner != old_gd):
            if data.date == today_dhaka:
                if current_time >= d_cutoff_time:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"আজকের রাতের খাবারের কাট-অফ সময় (বিকাল {d_cutoff_str}) পার হয়ে গেছে। পরিবর্তনের জন্য ম্যানেজারের সাথে যোগাযোগ করুন।",
                    )

    if existing:
        existing.breakfast = data.breakfast
        existing.lunch = data.lunch
        existing.dinner = data.dinner
        existing.guest_breakfast = data.guest_breakfast
        existing.guest_lunch = data.guest_lunch
        existing.guest_dinner = data.guest_dinner
        existing.is_off = data.is_off
        existing.notes = data.notes
        meal_obj = existing
    else:
        new_meal = Meal(
            mess_id=mess_id,
            user_id=current_user.id,
            date=data.date,
            breakfast=data.breakfast,
            lunch=data.lunch,
            dinner=data.dinner,
            guest_breakfast=data.guest_breakfast,
            guest_lunch=data.guest_lunch,
            guest_dinner=data.guest_dinner,
            is_off=data.is_off,
            notes=data.notes,
        )
        db.add(new_meal)
        meal_obj = new_meal

    await db.commit()
    await db.refresh(meal_obj)
    return {
        "message": "আপনার মিল পছন্দ সফলভাবে সংরক্ষিত হয়েছে",
        "meal": {
            "date": str(meal_obj.date),
            "breakfast": meal_obj.breakfast,
            "lunch": meal_obj.lunch,
            "dinner": meal_obj.dinner,
            "guest_breakfast": meal_obj.guest_breakfast,
            "guest_lunch": meal_obj.guest_lunch,
            "guest_dinner": meal_obj.guest_dinner,
            "is_off": meal_obj.is_off,
            "total_meals": meal_obj.total_meals,
        },
    }
