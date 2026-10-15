import uuid
from datetime import date as date_type
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.fixed_cost import FixedCost
from app.models.membership import Membership
from app.models.enums import MemberRole, FixedCostCategory
from app.core.deps import get_current_user, get_membership_for_mess, get_safe_month
from app.schemas.fixed_cost import (
    FixedCostCreate,
    FixedCostUpdate,
    FixedCostResponse,
    FixedCostMonthlySummary,
)

router = APIRouter(prefix="/messes/{mess_id}/fixed-costs", tags=["Fixed Costs & Utilities"])

@router.get("", response_model=FixedCostMonthlySummary)
@router.get("/", response_model=FixedCostMonthlySummary, include_in_schema=False)
async def list_fixed_costs(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
    month = get_safe_month(month)

    # 1. Fetch active memberships to get individual seat rent & active member count
    stmt_mem = (
        select(Membership)
        .where(Membership.mess_id == mess_id, Membership.left_at.is_(None))
    )
    memberships = (await db.execute(stmt_mem)).scalars().all()
    active_member_count = len(memberships)
    total_individual_rent = sum(m.rent_amount for m in memberships)

    # 2. Fetch fixed costs / utilities recorded for the month
    stmt = (
        select(FixedCost)
        .where(FixedCost.mess_id == mess_id, FixedCost.month == month)
        .order_by(FixedCost.cost_date.asc().nulls_last(), FixedCost.created_at.asc())
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
            sub_type=c.sub_type,
            cost_date=c.cost_date,
            billing_date=c.cost_date,
            meta_data=c.meta_data,
            notes=c.notes,
            created_at=c.created_at,
        )
        for c in costs
    ]

    # Category breakdown
    category_breakdown: Dict[str, float] = {}
    for c in items:
        cat_key = c.category.value if hasattr(c.category, "value") else str(c.category)
        category_breakdown[cat_key] = round(category_breakdown.get(cat_key, 0.0) + c.amount, 2)

    # Separate house rent and shared utilities
    # If rent was also recorded as a shared item, we track it; otherwise individual rents make up total rent
    shared_utilities_sum = sum(c.amount for c in items if c.category != FixedCostCategory.RENT)
    fixed_cost_rent_sum = sum(c.amount for c in items if c.category == FixedCostCategory.RENT)

    effective_total_rent = total_individual_rent if total_individual_rent > 0 else fixed_cost_rent_sum
    shared_per_member = round(shared_utilities_sum / active_member_count, 2) if active_member_count > 0 else 0.0
    overall_fixed = effective_total_rent + shared_utilities_sum

    return FixedCostMonthlySummary(
        month=month,
        total_fixed_cost=round(overall_fixed, 2),
        total_house_rent=round(effective_total_rent, 2),
        total_shared_utilities=round(shared_utilities_sum, 2),
        shared_utility_per_member=shared_per_member,
        active_member_count=active_member_count,
        category_breakdown=category_breakdown,
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
            detail="Only Owner or Manager can manage fixed costs and utilities",
        )

    effective_date = cost_in.cost_date or cost_in.billing_date
    cost = FixedCost(
        mess_id=mess_id,
        month=cost_in.month,
        category=cost_in.category,
        title=cost_in.title,
        amount=cost_in.amount,
        split_type=cost_in.split_type,
        sub_type=cost_in.sub_type,
        cost_date=effective_date,
        meta_data=cost_in.meta_data,
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
        sub_type=cost.sub_type,
        cost_date=cost.cost_date,
        billing_date=cost.cost_date,
        meta_data=cost.meta_data,
        notes=cost.notes,
        created_at=cost.created_at,
    )

@router.patch("/{cost_id}", response_model=FixedCostResponse)
@router.patch("/{cost_id}/", response_model=FixedCostResponse, include_in_schema=False)
async def update_fixed_cost(
    mess_id: uuid.UUID,
    cost_id: uuid.UUID,
    cost_in: FixedCostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can edit fixed costs and utilities",
        )

    stmt = select(FixedCost).where(FixedCost.id == cost_id, FixedCost.mess_id == mess_id)
    cost = (await db.execute(stmt)).scalar_one_or_none()
    if not cost:
        raise HTTPException(status_code=404, detail="Fixed cost record not found")

    if cost_in.category is not None:
        cost.category = cost_in.category
    if cost_in.title is not None:
        cost.title = cost_in.title
    if cost_in.amount is not None:
        cost.amount = cost_in.amount
    if cost_in.split_type is not None:
        cost.split_type = cost_in.split_type
    if cost_in.sub_type is not None:
        cost.sub_type = cost_in.sub_type
    eff_update_date = cost_in.cost_date or cost_in.billing_date
    if eff_update_date is not None:
        cost.cost_date = eff_update_date
    if cost_in.meta_data is not None:
        cost.meta_data = cost_in.meta_data
    if cost_in.notes is not None:
        cost.notes = cost_in.notes

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
        sub_type=cost.sub_type,
        cost_date=cost.cost_date,
        billing_date=cost.cost_date,
        meta_data=cost.meta_data,
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

# Standalone fallback router for /fixed-costs (handles direct or legacy calls)
root_router = APIRouter(prefix="/fixed-costs", tags=["Fixed Costs Direct"])

@root_router.get("", response_model=FixedCostMonthlySummary)
@root_router.get("/", response_model=FixedCostMonthlySummary, include_in_schema=False)
async def list_fixed_costs_root(
    mess_id: uuid.UUID = Query(...),
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_fixed_costs(mess_id=mess_id, month=month, current_user=current_user, db=db)

@root_router.post("", response_model=FixedCostResponse, status_code=status.HTTP_201_CREATED)
@root_router.post("/", response_model=FixedCostResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_fixed_cost_root(
    cost_in: FixedCostCreate,
    mess_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_fixed_cost(mess_id=mess_id, cost_in=cost_in, current_user=current_user, db=db)

@root_router.delete("/{cost_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fixed_cost_root(
    cost_id: uuid.UUID,
    mess_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FixedCost).where(FixedCost.id == cost_id)
    if mess_id:
        stmt = stmt.where(FixedCost.mess_id == mess_id)
    cost = (await db.execute(stmt)).scalar_one_or_none()
    if not cost:
        raise HTTPException(status_code=404, detail="Fixed cost record not found")

    mem = await get_membership_for_mess(cost.mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only Owner or Manager can delete fixed costs")

    await db.delete(cost)
    await db.commit()
    return None

