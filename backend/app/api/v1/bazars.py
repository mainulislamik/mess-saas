import uuid
from datetime import date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.bazar import Bazar
from app.models.enums import MemberRole
from app.core.deps import get_current_user, get_membership_for_mess
from app.schemas.bazar import BazarCreate, BazarResponse, BazarMonthlySummary

router = APIRouter(prefix="/messes/{mess_id}/bazars", tags=["Bazars"])

@router.get("", response_model=BazarMonthlySummary)
@router.get("/", response_model=BazarMonthlySummary, include_in_schema=False)
async def list_bazars(
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
        select(Bazar)
        .options(selectinload(Bazar.user))
        .where(
            Bazar.mess_id == mess_id,
            Bazar.date >= start_date,
            Bazar.date < end_date,
        )
        .order_by(Bazar.date.desc(), Bazar.created_at.desc())
    )
    result = await db.execute(stmt)
    bazars = result.scalars().all()

    items = [
        BazarResponse(
            id=b.id,
            mess_id=b.mess_id,
            user_id=b.user_id,
            user_name=b.user.name if b.user else "Member",
            date=b.date,
            amount=b.amount,
            items=b.items,
            receipt_url=b.receipt_url,
            notes=b.notes,
            created_at=b.created_at,
        )
        for b in bazars
    ]

    total = sum(b.amount for b in items)
    return BazarMonthlySummary(
        month=month,
        total_bazar=round(total, 2),
        bazar_count=len(items),
        items=items,
    )

@router.post("", response_model=BazarResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BazarResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_bazar(
    mess_id: uuid.UUID,
    bazar_in: BazarCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    # Any member can add bazar they did, or manager/owner can add for anyone
    if mem.role == MemberRole.MEMBER and bazar_in.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members can only record their own bazar expenses",
        )

    bazar = Bazar(
        mess_id=mess_id,
        user_id=bazar_in.user_id,
        date=bazar_in.date,
        amount=bazar_in.amount,
        items=bazar_in.items,
        receipt_url=bazar_in.receipt_url,
        notes=bazar_in.notes,
    )
    db.add(bazar)
    await db.commit()
    await db.refresh(bazar)

    user_stmt = select(User).where(User.id == bazar.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    return BazarResponse(
        id=bazar.id,
        mess_id=bazar.mess_id,
        user_id=bazar.user_id,
        user_name=user.name if user else "Member",
        date=bazar.date,
        amount=bazar.amount,
        items=bazar.items,
        receipt_url=bazar.receipt_url,
        notes=bazar.notes,
        created_at=bazar.created_at,
    )

@router.delete("/{bazar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bazar(
    mess_id: uuid.UUID,
    bazar_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)

    stmt = select(Bazar).where(Bazar.id == bazar_id, Bazar.mess_id == mess_id)
    bazar = (await db.execute(stmt)).scalar_one_or_none()
    if not bazar:
        raise HTTPException(status_code=404, detail="Bazar record not found")

    if mem.role == MemberRole.MEMBER and bazar.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this bazar entry")

    await db.delete(bazar)
    await db.commit()
    return None
