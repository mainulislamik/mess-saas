import uuid
from datetime import date as date_type, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.bazar import Bazar
from app.models.enums import MemberRole, BazarStatus
from app.core.deps import get_current_user, get_membership_for_mess, get_safe_month
from app.api.v1.closings import check_month_not_closed
from app.schemas.bazar import (
    BazarCreate,
    BazarResponse,
    BazarReviewRequest,
    BazarMonthlySummary,
    BazarQuickParseRequest,
    BazarQuickParseResponse,
    BazarPriceTrendItem,
    BazarParsedItem,
)
from app.services.bazar_parser import parse_bazar_text

router = APIRouter(prefix="/messes/{mess_id}/bazars", tags=["Bazars"])

@router.get("", response_model=BazarMonthlySummary)
@router.get("/", response_model=BazarMonthlySummary, include_in_schema=False)
async def list_bazars(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership_for_mess(mess_id, current_user, db)
    month = get_safe_month(month)

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
            status=b.status,
            approved_by=b.approved_by,
            approved_at=b.approved_at,
            rejection_reason=b.rejection_reason,
            created_at=b.created_at,
        )
        for b in bazars
    ]

    total = sum(b.amount for b in items if b.status == BazarStatus.APPROVED)
    pending_count = len([b for b in items if b.status == BazarStatus.PENDING])
    return BazarMonthlySummary(
        month=month,
        total_bazar=round(total, 2),
        total_bazar_amount=round(total, 2),
        bazar_count=len(items),
        pending_count=pending_count,
        items=items,
        bazars=items,
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

    await check_month_not_closed(db, mess_id, bazar_in.date)

    # If regular member, strictly enforce user_id is current_user.id
    target_user_id = bazar_in.user_id
    if mem.role == MemberRole.MEMBER:
        if bazar_in.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Members can only record their own bazar expenses",
            )
        target_user_id = current_user.id
        status_val = BazarStatus.PENDING
        approved_by = None
        approved_at = None
    else:
        status_val = BazarStatus.APPROVED
        approved_by = current_user.id
        approved_at = datetime.utcnow()

    bazar = Bazar(
        mess_id=mess_id,
        user_id=target_user_id,
        date=bazar_in.date,
        amount=bazar_in.amount,
        items=bazar_in.items,
        receipt_url=bazar_in.receipt_url,
        notes=bazar_in.notes,
        status=status_val,
        approved_by=approved_by,
        approved_at=approved_at,
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
        status=bazar.status,
        approved_by=bazar.approved_by,
        approved_at=bazar.approved_at,
        rejection_reason=bazar.rejection_reason,
        created_at=bazar.created_at,
    )

@router.patch("/{bazar_id}/review", response_model=BazarResponse)
@router.patch("/{bazar_id}/review/", response_model=BazarResponse, include_in_schema=False)
async def review_bazar(
    mess_id: uuid.UUID,
    bazar_id: uuid.UUID,
    review_in: BazarReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem = await get_membership_for_mess(mess_id, current_user, db)
    if mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Manager or Owner can approve or reject bazar expenses",
        )

    stmt = select(Bazar).options(selectinload(Bazar.user)).where(Bazar.id == bazar_id, Bazar.mess_id == mess_id)
    bazar = (await db.execute(stmt)).scalar_one_or_none()
    if not bazar:
        raise HTTPException(status_code=404, detail="Bazar record not found")

    await check_month_not_closed(db, mess_id, bazar.date)

    if review_in.action == "approve":
        bazar.status = BazarStatus.APPROVED
        bazar.approved_by = current_user.id
        bazar.approved_at = datetime.utcnow()
        bazar.rejection_reason = None
    elif review_in.action == "reject":
        bazar.status = BazarStatus.REJECTED
        bazar.approved_by = current_user.id
        bazar.approved_at = datetime.utcnow()
        bazar.rejection_reason = review_in.rejection_reason or "ম্যানেজার কর্তৃক প্রত্যাখ্যাত"

    await db.commit()
    await db.refresh(bazar)

    return BazarResponse(
        id=bazar.id,
        mess_id=bazar.mess_id,
        user_id=bazar.user_id,
        user_name=bazar.user.name if bazar.user else "Member",
        date=bazar.date,
        amount=bazar.amount,
        items=bazar.items,
        receipt_url=bazar.receipt_url,
        notes=bazar.notes,
        status=bazar.status,
        approved_by=bazar.approved_by,
        approved_at=bazar.approved_at,
        rejection_reason=bazar.rejection_reason,
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

    await check_month_not_closed(db, mess_id, bazar.date)

    if mem.role == MemberRole.MEMBER:
        if bazar.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this bazar entry")
        if bazar.status == BazarStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="অনুমোদিত বাজার এন্ট্রি সাধারণ মেম্বার ডিলিট করতে পারবেন না। ম্যানেজারের সাথে যোগাযোগ করুন।",
            )

    await db.delete(bazar)
    await db.commit()
    return None

@router.post("/parse-quick", response_model=BazarQuickParseResponse)
async def parse_quick_bazar(
    mess_id: uuid.UUID,
    payload: BazarQuickParseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parses natural language / raw text of bazar items (Bangla/English)
    into structured items list and total sum.
    """
    await get_membership_for_mess(mess_id, current_user, db)
    parsed = parse_bazar_text(payload.text)
    items = [BazarParsedItem(item=i["item"], amount=i["amount"]) for i in parsed["items"]]
    return BazarQuickParseResponse(
        items=items,
        total_amount=parsed["total_amount"],
        formatted_description=parsed["formatted_description"],
    )

@router.get("/price-trends", response_model=List[BazarPriceTrendItem])
async def get_bazar_price_trends(
    mess_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extracts recurring items from recent mess bazar logs and provides price trends.
    """
    await get_membership_for_mess(mess_id, current_user, db)

    stmt = (
        select(Bazar)
        .where(Bazar.mess_id == mess_id)
        .order_by(Bazar.date.desc())
        .limit(40)
    )
    result = await db.execute(stmt)
    bazars = result.scalars().all()

    # Track item occurrences and prices
    item_history: dict[str, list[float]] = {}
    for b in bazars:
        parsed = parse_bazar_text(b.items)
        for it in parsed["items"]:
            clean_name = it["item"].strip()
            # Group common names
            if "ডিম" in clean_name or "dim" in clean_name.lower():
                key = "ডিম (ডজন/হালি)"
            elif "আলু" in clean_name or "alu" in clean_name.lower():
                key = "আলু"
            elif "পেঁয়াজ" in clean_name or "পেঁয়াজ" in clean_name or "peyaj" in clean_name.lower():
                key = "পেঁয়াজ"
            elif "মুরগি" in clean_name or "chicken" in clean_name.lower() or "ব্রয়লার" in clean_name or "কক" in clean_name:
                key = "মুরগি"
            elif "গরু" in clean_name or "beef" in clean_name.lower():
                key = "গরুর মাংস"
            elif "তেল" in clean_name or "oil" in clean_name.lower():
                key = "সয়াবিন তেল"
            elif "চাল" in clean_name or "chal" in clean_name.lower() or "rice" in clean_name.lower():
                key = "চাল"
            elif "ডাল" in clean_name or "dal" in clean_name.lower():
                key = "ডাল"
            elif "মাছ" in clean_name or "fish" in clean_name.lower():
                key = "মাছ"
            else:
                key = clean_name

            if key not in item_history:
                item_history[key] = []
            item_history[key].append(it["amount"])

    trends: List[BazarPriceTrendItem] = []
    for name, prices in item_history.items():
        if len(prices) >= 1:
            avg_p = sum(prices) / len(prices)
            last_p = prices[0]
            if len(prices) > 1:
                if last_p > avg_p * 1.05:
                    change = "up"
                elif last_p < avg_p * 0.95:
                    change = "down"
                else:
                    change = "stable"
            else:
                change = "stable"

            trends.append(
                BazarPriceTrendItem(
                    item_name=name,
                    frequency=len(prices),
                    last_price=round(last_p, 2),
                    avg_price=round(avg_p, 2),
                    price_change=change,
                )
            )

    trends.sort(key=lambda x: x.frequency, reverse=True)
    return trends[:10]

