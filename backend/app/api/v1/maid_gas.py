import uuid
from datetime import datetime, date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.membership import Membership
from app.models.maid_gas import MaidAttendance, GasLog
from app.schemas.maid_gas import (
    MaidAttendanceCreate,
    MaidAttendanceOut,
    GasLogCreate,
    GasLogOut,
)

router = APIRouter(prefix="/messes/{mess_id}/maid-gas", tags=["Maid & Gas Tracking"])

async def verify_mess_access(mess_id: uuid.UUID, user: User, db: AsyncSession, require_manager: bool = False):
    result = await db.execute(
        select(Membership).where(
            Membership.mess_id == mess_id,
            Membership.user_id == user.id,
            Membership.is_active == True
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="এই মেসে আপনার কোনো অ্যাক্সেস নেই")
    if require_manager and membership.role not in ["owner", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="শুধুমাত্র ম্যানেজার বা ওনার এই অপারেশন করতে পারবেন")
    return membership

@router.get("", response_model=dict)
async def get_maid_gas_dashboard(
    mess_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_mess_access(mess_id, current_user, db)

    # Fetch recent attendances
    att_res = await db.execute(
        select(MaidAttendance).where(MaidAttendance.mess_id == mess_id).order_by(desc(MaidAttendance.date)).limit(30)
    )
    attendances = att_res.scalars().all()

    # Fetch gas logs
    gas_res = await db.execute(
        select(GasLog).where(GasLog.mess_id == mess_id).order_by(desc(GasLog.installed_date))
    )
    gas_logs = gas_res.scalars().all()

    formatted_gas = []
    today = date_type.today()
    for g in gas_logs:
        elapsed = (today - g.installed_date).days
        if elapsed < 0:
            elapsed = 0
        remaining = g.expected_days - elapsed
        if remaining < 0:
            remaining = 0
        pct = round(min(100.0, (elapsed / g.expected_days) * 100), 1) if g.expected_days > 0 else 100.0
        st = "normal"
        if pct >= 85 or remaining <= 3:
            st = "exhausted"
        elif pct >= 60:
            st = "warning"

        formatted_gas.append({
            "id": g.id,
            "mess_id": g.mess_id,
            "cylinder_name": g.cylinder_name,
            "installed_date": g.installed_date,
            "expected_days": g.expected_days,
            "cost": g.cost,
            "is_active": g.is_active,
            "finished_date": g.finished_date,
            "days_elapsed": elapsed,
            "days_remaining": remaining,
            "percentage_used": pct,
            "status": st,
        })

    return {
        "attendances": [MaidAttendanceOut.model_validate(a) for a in attendances],
        "gas_logs": formatted_gas,
    }

@router.post("/attendance", response_model=MaidAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_maid_attendance(
    mess_id: uuid.UUID,
    payload: MaidAttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_mess_access(mess_id, current_user, db, require_manager=True)

    att = MaidAttendance(
        mess_id=mess_id,
        date=payload.date,
        maid_name=payload.maid_name,
        is_present=payload.is_present,
        daily_wage=payload.daily_wage,
        advance_paid=payload.advance_paid,
        notes=payload.notes,
    )
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return att

@router.post("/gas", response_model=GasLogOut, status_code=status.HTTP_201_CREATED)
async def create_gas_log(
    mess_id: uuid.UUID,
    payload: GasLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_mess_access(mess_id, current_user, db, require_manager=True)

    # Mark existing active gas as finished if new one installed
    await db.execute(
        select(GasLog).where(GasLog.mess_id == mess_id, GasLog.is_active == True)
    )
    # Actually update them
    existing_actives = (await db.execute(select(GasLog).where(GasLog.mess_id == mess_id, GasLog.is_active == True))).scalars().all()
    for ea in existing_actives:
        ea.is_active = False
        ea.finished_date = payload.installed_date

    gas = GasLog(
        mess_id=mess_id,
        cylinder_name=payload.cylinder_name,
        installed_date=payload.installed_date,
        expected_days=payload.expected_days,
        cost=payload.cost,
        is_active=True,
    )
    db.add(gas)
    await db.commit()
    await db.refresh(gas)

    today = date_type.today()
    elapsed = (today - gas.installed_date).days
    remaining = gas.expected_days - elapsed
    pct = round(min(100.0, (elapsed / gas.expected_days) * 100), 1)
    st = "normal"
    if pct >= 85 or remaining <= 3:
        st = "exhausted"
    elif pct >= 60:
        st = "warning"

    return GasLogOut(
        id=gas.id,
        mess_id=gas.mess_id,
        cylinder_name=gas.cylinder_name,
        installed_date=gas.installed_date,
        expected_days=gas.expected_days,
        cost=gas.cost,
        is_active=gas.is_active,
        finished_date=gas.finished_date,
        days_elapsed=elapsed,
        days_remaining=max(0, remaining),
        percentage_used=pct,
        status=st,
    )
