import uuid
from datetime import date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.deposit import Deposit
from app.models.enums import MemberRole
from app.core.deps import get_current_user, get_membership_for_mess
from app.schemas.deposit import DepositCreate, DepositResponse, DepositMonthlySummary

router = APIRouter(prefix="/messes/{mess_id}/deposits", tags=["Deposits"])

@router.get("", response_model=DepositMonthlySummary)
@router.get("/", response_model=DepositMonthlySummary, include_in_schema=False)
async def list_deposits(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)

    if not month:
        today = date_type.today()
        month = f"{today.year:04d}-{today.month:02d}"

    year, m_num = map(int, month.split("-"))
    start_date = date_type(year, m_num, 1)
    if m_num == 12:
        end_date = date_type(year + 1, 1, 1)
    else:
        end_date = date_type(year, m_num + 1, 1)

    stmt = (
        select(Deposit)
        .options(selectinload(Deposit.user))
        .where(
            Deposit.mess_id == mess_id,
            Deposit.date >= start_date,
            Deposit.date < end_date,
        )
        .order_by(Deposit.date.desc(), Deposit.created_at.desc())
    )
    result = await db.execute(stmt)
    deposits = result.scalars().all()

    items = [
        DepositResponse(
            id=d.id,
            mess_id=d.mess_id,
            user_id=d.user_id,
            user_name=d.user.name if d.user else "Member",
            amount=d.amount,
            date=d.date,
            method=d.method,
            transaction_id=d.transaction_id,
            is_verified=d.is_verified,
            notes=d.notes,
            created_at=d.created_at,
        )
        for d in deposits
    ]

    total = sum(d.amount for d in items)
    return DepositMonthlySummary(
        month=month,
        total_deposit=round(total, 2),
        items=items,
    )

@router.post("", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DepositResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_deposit(
    mess_id: uuid.UUID,
    deposit_in: DepositCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    # Manager or Owner can add deposit for any member; normal member can only submit their own deposit proof
    if mem.role == MemberRole.MEMBER and deposit_in.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members can only submit deposits for themselves",
        )

    deposit = Deposit(
        mess_id=mess_id,
        user_id=deposit_in.user_id,
        amount=deposit_in.amount,
        date=deposit_in.date,
        method=deposit_in.method,
        transaction_id=deposit_in.transaction_id,
        notes=deposit_in.notes,
        is_verified=True if mem.role in [MemberRole.OWNER, MemberRole.MANAGER] else False,
    )
    db.add(deposit)
    await db.commit()
    await db.refresh(deposit)

    user_stmt = select(User).where(User.id == deposit.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    return DepositResponse(
        id=deposit.id,
        mess_id=deposit.mess_id,
        user_id=deposit.user_id,
        user_name=user.name if user else "Member",
        amount=deposit.amount,
        date=deposit.date,
        method=deposit.method,
        transaction_id=deposit.transaction_id,
        is_verified=deposit.is_verified,
        notes=deposit.notes,
        created_at=deposit.created_at,
    )

@router.delete("/{deposit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deposit(
    mess_id: uuid.UUID,
    deposit_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only Owner or Manager can delete deposit records")

    stmt = select(Deposit).where(Deposit.id == deposit_id, Deposit.mess_id == mess_id)
    deposit = (await db.execute(stmt)).scalar_one_or_none()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit record not found")

    await db.delete(deposit)
    await db.commit()
    return None
