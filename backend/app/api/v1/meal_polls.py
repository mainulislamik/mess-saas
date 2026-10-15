import uuid
import json
from datetime import datetime, date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.menu import MealPoll, MealPollOption, MealPollVote, WeeklyMenuRoutine
from app.schemas.menu import (
    MealPollCreate,
    MealPollOut,
    MealPollOptionOut,
    MealPollVoteRequest,
    WeeklyRoutineUpdate,
    WeeklyRoutineOut,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/messes/{mess_id}/meal-polls", tags=["Meal Polls & Menu"])

DEFAULT_WEEKLY_ROUTINE = {
    "saturday": {"day_bn": "শনিবার", "breakfast": "খিচুড়ি ও ডিম ভুনা", "lunch": "ভাত, রুই মাছের ঝোল ও ডাল", "dinner": "ভাত, আলু ভর্তা ও মুরগির মাংস"},
    "sunday": {"day_bn": "রবিবার", "breakfast": "রুটি, সবজি ও চা", "lunch": "ভাত, মুরগির মাংস ও ডাল", "dinner": "ভাত, ডিম কারি ও সবজি"},
    "monday": {"day_bn": "সোমবার", "breakfast": "পরোটা ও ডিম ভাজি", "lunch": "ভাত, পাঙ্গাস/তেলাপিয়া মাছ ও ডাল", "dinner": "ভাত, শাক ভাজি ও ডাল"},
    "tuesday": {"day_bn": "মঙ্গলবার", "breakfast": "রুটি ও ডাল", "lunch": "ভাত, ডিম ভুনা ও সবজি", "dinner": "ভাত, মুরগির মাংস ও ডাল"},
    "wednesday": {"day_bn": "বুধবার", "breakfast": "খিচুড়ি ও আচার", "lunch": "ভাত, পাবদা/শিং মাছ ও ডাল", "dinner": "ভাত, সবজি ও ভর্তা"},
    "thursday": {"day_bn": "বৃহস্পতিবার", "breakfast": "রুটি, ডিম ও সুজি", "lunch": "ভাত, ছোট মাছ চচ্চড়ি ও ডাল", "dinner": "ভাত, ডিম কারি ও ডাল"},
    "friday": {"day_bn": "শুক্রবার", "breakfast": "হালকা নাস্তা / পরোটা", "lunch": "স্পেশাল মেন্যু (পোল বিজয়ী)", "dinner": "ভাত ও হালকা খাবার"},
}

async def get_membership_or_403(mess_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Membership:
    res = await db.execute(select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == user_id))
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="আপনি এই মেসের সদস্য নন")
    return m

@router.get("", response_model=List[MealPollOut])
async def list_meal_polls(
    mess_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_or_403(mess_id, current_user.id, db)
    res = await db.execute(
        select(MealPoll)
        .where(MealPoll.mess_id == mess_id)
        .order_by(MealPoll.created_at.desc())
        .options(
            selectinload(MealPoll.options).selectinload(MealPollOption.votes).selectinload(MealPollVote.user),
            selectinload(MealPoll.created_by),
        )
    )
    polls = res.scalars().all()

    output = []
    for poll in polls:
        total_votes = 0
        user_voted_id = None
        options_out = []
        max_votes = -1
        winning_opt = None

        for opt in poll.options:
            v_count = len(opt.votes)
            total_votes += v_count
            voters = [v.user.name for v in opt.votes if v.user]
            for v in opt.votes:
                if v.user_id == current_user.id:
                    user_voted_id = opt.id

            opt_data = MealPollOptionOut(
                id=opt.id,
                option_text=opt.option_text,
                bazar_suggestion=opt.bazar_suggestion,
                vote_count=v_count,
                voter_names=voters,
            )
            options_out.append(opt_data)

            if v_count > max_votes and v_count > 0:
                max_votes = v_count
                winning_opt = opt_data

        output.append(
            MealPollOut(
                id=poll.id,
                mess_id=poll.mess_id,
                title=poll.title,
                target_date=poll.target_date,
                status=poll.status,
                created_by_name=poll.created_by.name if poll.created_by else "সদস্য",
                created_at=poll.created_at,
                options=options_out,
                total_votes=total_votes,
                user_voted_option_id=user_voted_id,
                winning_option=winning_opt,
            )
        )
    return output

@router.post("", response_model=MealPollOut)
async def create_meal_poll(
    mess_id: uuid.UUID,
    payload: MealPollCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_or_403(mess_id, current_user.id, db)
    poll = MealPoll(
        mess_id=mess_id,
        title=payload.title,
        target_date=payload.target_date,
        status="active",
        created_by_id=current_user.id,
    )
    db.add(poll)
    await db.flush()

    for item in payload.options:
        opt = MealPollOption(
            poll_id=poll.id,
            option_text=item.get("option_text", ""),
            bazar_suggestion=item.get("bazar_suggestion"),
        )
        db.add(opt)

    await db.commit()

    # Re-fetch with relationships
    return (await list_meal_polls(mess_id, current_user, db))[0]

@router.post("/{poll_id}/vote")
async def vote_meal_poll(
    mess_id: uuid.UUID,
    poll_id: uuid.UUID,
    payload: MealPollVoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_or_403(mess_id, current_user.id, db)

    # Check option exists
    res = await db.execute(select(MealPollOption).where(MealPollOption.id == payload.option_id, MealPollOption.poll_id == poll_id))
    option = res.scalar_one_or_none()
    if not option:
        raise HTTPException(status_code=404, detail="মেন্যু অপশনটি পাওয়া যায়নি")

    # Upsert user vote
    vote_res = await db.execute(select(MealPollVote).where(MealPollVote.poll_id == poll_id, MealPollVote.user_id == current_user.id))
    existing_vote = vote_res.scalar_one_or_none()

    if existing_vote:
        existing_vote.option_id = payload.option_id
        existing_vote.voted_at = datetime.utcnow()
    else:
        new_vote = MealPollVote(
            poll_id=poll_id,
            option_id=payload.option_id,
            user_id=current_user.id,
        )
        db.add(new_vote)

    await db.commit()
    return {"message": "ভোট সফলভাবে গণনা করা হয়েছে", "option_id": payload.option_id}

@router.get("/routine", response_model=WeeklyRoutineOut)
async def get_weekly_routine(
    mess_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_or_403(mess_id, current_user.id, db)
    res = await db.execute(select(WeeklyMenuRoutine).where(WeeklyMenuRoutine.mess_id == mess_id))
    routine = res.scalar_one_or_none()

    if not routine:
        routine = WeeklyMenuRoutine(
            mess_id=mess_id,
            schedule_json=json.dumps(DEFAULT_WEEKLY_ROUTINE, ensure_ascii=False),
        )
        db.add(routine)
        await db.commit()
        await db.refresh(routine)

    return routine

@router.put("/routine", response_model=WeeklyRoutineOut)
async def update_weekly_routine(
    mess_id: uuid.UUID,
    payload: WeeklyRoutineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_or_403(mess_id, current_user.id, db)
    if mem.role.value not in ["owner", "manager"] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="শুধুমাত্র ম্যানেজার রুটিন পরিবর্তন করতে পারেন")

    res = await db.execute(select(WeeklyMenuRoutine).where(WeeklyMenuRoutine.mess_id == mess_id))
    routine = res.scalar_one_or_none()

    if not routine:
        routine = WeeklyMenuRoutine(
            mess_id=mess_id,
            schedule_json=payload.schedule_json,
        )
        db.add(routine)
    else:
        routine.schedule_json = payload.schedule_json
        routine.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(routine)
    return routine
