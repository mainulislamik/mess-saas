import uuid
from datetime import date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.fixed_cost import FixedCost
from app.models.enums import MemberRole
from app.core.deps import get_current_user, get_membership_for_mess
from app.schemas.fixed_cost import (
    FixedCostCreate,
    FixedCostResponse,
    FixedCostMonthlySummary,
)

router = APIRouter(prefix="/messes/{mess_id}/fixed-costs", tags=["Fixed Costs"])

@router.get("", response_model=FixedCostMonthlySummary)
@router.get("/", response_model=FixedCostMonthlySummary, include_in_schema=False)
async def list_fixed_costs(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)

    if not month:
        today = date_type.today()
        month = f"{today.year:04d}-{today.month:02d}"

    stmt = (
        select(FixedCost)
        .where(FixedCost.mess_id == mess_id, FixedCost.month == month)
        .order_by(FixedCost.created_at.asc())
    )
    result = await db.execute(stmt)
    costs = result.scalars().all()

    items = [
        FixedCostResponse(
            id=c.id,
            mess_id=c.mess_id,
            month=c.month,
            category=c.category,
            title=c.title,
            amount=c.amount,
            split_type=c.split_type,
            notes=c.notes,
            created_at=c.created_at,
        )
        for c in costs
    ]

    total = sum(c.amount for c in items)
    return FixedCostMonthlySummary(
        month=month,
        total_fixed_cost=round(total, 2),
        items=items,
    )

@router.post("", response_model=FixedCostResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FixedCostResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_fixed_cost(
    mess_id: uuid.UUID,
    cost_in: FixedCostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can manage fixed costs",
        )

    cost = FixedCost(
        mess_id=mess_id,
        month=cost_in.month,
        category=cost_in.category,
        title=cost_in.title,
        amount=cost_in.amount,
        split_type=cost_in.split_type,
        notes=cost_in.notes,
    )
    db.add(cost)
    await db.commit()
    await db.refresh(cost)

    return FixedCostResponse(
        id=cost.id,
        mess_id=cost.mess_id,
        month=cost.month,
        category=cost.category,
        title=cost.title,
        amount=cost.amount,
        split_type=cost.split_type,
        notes=cost.notes,
        created_at=cost.created_at,
    )

@router.delete("/{cost_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fixed_cost(
    mess_id: uuid.UUID,
    cost_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only Owner or Manager can delete fixed costs")

    stmt = select(FixedCost).where(FixedCost.id == cost_id, FixedCost.mess_id == mess_id)
    cost = (await db.execute(stmt)).scalar_one_or_none()
    if not cost:
        raise HTTPException(status_code=404, detail="Fixed cost record not found")

    await db.delete(cost)
    await db.commit()
    return None
