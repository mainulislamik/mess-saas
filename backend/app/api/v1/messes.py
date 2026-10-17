import secrets
import string
import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, attributes

from app.db.session import get_db
from app.models.user import User
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.fixed_cost import FixedCost
from app.models.member_rent import MemberMonthlyRent
from app.models.enums import MemberRole, FixedCostCategory
from app.core.deps import get_current_user, get_safe_month
from app.api.v1.closings import check_month_not_closed
from app.schemas.member_rent import (
    MonthlyRentSummaryResponse,
    MonthlyRentBatchUpdateRequest,
    DistributeShortfallRequest,
    MemberMonthlyRentItem,
)
from app.schemas.mess import (
    MessCreate,
    MessUpdate,
    MessResponse,
    MessDetailResponse,
    InviteCodeResponse,
    JoinMessRequest,
    MembershipResponse,
    MembershipRoleUpdate,
    MealRulesUpdate,
    BatchRentUpdateRequest,
)

router = APIRouter(prefix="/messes", tags=["Messes"])

def generate_invite_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    alphabet = alphabet.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))

def generate_slug(name: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", name.lower())
    slug_base = re.sub(r"[-\s]+", "-", cleaned).strip("-")
    if not slug_base:
        slug_base = "mess"
    suffix = secrets.token_hex(3)
    return f"{slug_base}-{suffix}"

@router.post("", response_model=MessResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MessResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_mess(
    mess_in: MessCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invite_code = generate_invite_code()
    slug = generate_slug(mess_in.name)

    mess = Mess(
        name=mess_in.name,
        slug=slug,
        district=mess_in.district,
        thana=mess_in.thana,
        area=mess_in.area,
        address=mess_in.address,
        owner_id=current_user.id,
        invite_code=invite_code,
    )
    db.add(mess)
    await db.flush()

    membership = Membership(
        user_id=current_user.id,
        mess_id=mess.id,
        role=MemberRole.OWNER,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(mess)

    resp = MessResponse.model_validate(mess)
    resp.my_role = MemberRole.OWNER
    return resp

@router.get("", response_model=List[MessResponse])
@router.get("/", response_model=List[MessResponse], include_in_schema=False)
@router.get("/my", response_model=List[MessResponse], include_in_schema=False)
@router.get("/my/", response_model=List[MessResponse], include_in_schema=False)
async def get_my_messes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Mess, Membership.role)
        .join(Membership, Mess.id == Membership.mess_id)
        .where(Membership.user_id == current_user.id, Mess.is_active == True)
        .order_by(Membership.joined_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    messes = []
    for mess, role in rows:
        m_resp = MessResponse.model_validate(mess)
        m_resp.my_role = role
        messes.append(m_resp)

    return messes

@router.post("/join", response_model=MessResponse)
@router.post("/join/", response_model=MessResponse, include_in_schema=False)
@router.post("/join/{code}", response_model=MessResponse, include_in_schema=False)
async def join_mess(
    join_in: Optional[JoinMessRequest] = None,
    code: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invite_code = (code or (join_in.code if join_in else "")).strip().upper()
    if not invite_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite code required")
    result = await db.execute(select(Mess).where(Mess.invite_code == invite_code, Mess.is_active == True))
    mess = result.scalar_one_or_none()
    if not mess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code or mess not found",
        )

    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess.id, Membership.user_id == current_user.id)
    )
    existing_membership = mem_result.scalar_one_or_none()
    if existing_membership:
        resp = MessResponse.model_validate(mess)
        resp.my_role = existing_membership.role
        return resp

    new_membership = Membership(
        user_id=current_user.id,
        mess_id=mess.id,
        role=MemberRole.MEMBER,
    )
    db.add(new_membership)
    await db.commit()

    resp = MessResponse.model_validate(mess)
    resp.my_role = MemberRole.MEMBER
    return resp

@router.get("/{mess_id}", response_model=MessDetailResponse)
@router.get("/{mess_id}/", response_model=MessDetailResponse, include_in_schema=False)
async def get_mess_by_id(
    mess_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    user_mem = mem_result.scalar_one_or_none()
    if not user_mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this mess",
        )

    stmt = select(Mess).options(selectinload(Mess.memberships).selectinload(Membership.user)).where(Mess.id == mess_id)
    result = await db.execute(stmt)
    mess = result.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess not found")

    members_resp = [
        MembershipResponse(
            id=m.id,
            user_id=m.user_id,
            mess_id=m.mess_id,
            role=m.role,
            seat_label=m.seat_label,
            joined_at=m.joined_at,
            user=m.user,
        )
        for m in mess.memberships
    ]

    detail = MessDetailResponse(
        id=mess.id,
        name=mess.name,
        slug=mess.slug,
        district=mess.district,
        thana=mess.thana,
        area=mess.area,
        address=mess.address,
        owner_id=mess.owner_id,
        plan=mess.plan,
        invite_code=mess.invite_code,
        is_active=mess.is_active,
        created_at=mess.created_at,
        my_role=user_mem.role,
        members=members_resp,
    )
    return detail

@router.patch("/{mess_id}", response_model=MessResponse)
@router.patch("/{mess_id}/", response_model=MessResponse, include_in_schema=False)
async def update_mess(
    mess_id: uuid.UUID,
    mess_in: MessUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Mess).where(Mess.id == mess_id))
    mess = result.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess not found")

    if mess.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the mess owner can update mess settings",
        )

    update_data = mess_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(mess, field, val)

    await db.commit()
    await db.refresh(mess)

    resp = MessResponse.model_validate(mess)
    resp.my_role = MemberRole.OWNER
    return resp

@router.post("/{mess_id}/invite", response_model=InviteCodeResponse)
@router.post("/{mess_id}/invite/", response_model=InviteCodeResponse, include_in_schema=False)
async def get_or_regenerate_invite_code(
    mess_id: uuid.UUID,
    regenerate: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    user_mem = mem_result.scalar_one_or_none()
    if not user_mem or user_mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or managers can generate invite codes",
        )

    result = await db.execute(select(Mess).where(Mess.id == mess_id))
    mess = result.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess not found")

    if regenerate or not mess.invite_code:
        mess.invite_code = generate_invite_code()
        await db.commit()
        await db.refresh(mess)

    return InviteCodeResponse(invite_code=mess.invite_code, mess_id=mess.id)

@router.get("/{mess_id}/members", response_model=List[MembershipResponse])
@router.get("/{mess_id}/members/", response_model=List[MembershipResponse], include_in_schema=False)
async def get_mess_members(
    mess_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    user_mem = mem_result.scalar_one_or_none()
    if not user_mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this mess",
        )

    stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id)
        .order_by(Membership.joined_at.asc())
    )
    result = await db.execute(stmt)
    memberships = result.scalars().all()

    return [
        MembershipResponse(
            id=m.id,
            user_id=m.user_id,
            mess_id=m.mess_id,
            role=m.role,
            seat_label=m.seat_label,
            rent_amount=m.rent_amount,
            joined_at=m.joined_at,
            user=m.user,
            user_name=m.user.name if m.user else "সদস্য",
            phone=m.user.phone if m.user else "",
        )
        for m in memberships
    ]

@router.patch("/{mess_id}/members-rent", response_model=List[MembershipResponse])
@router.patch("/{mess_id}/members-rent/", response_model=List[MembershipResponse], include_in_schema=False)
async def update_members_rent_batch(
    mess_id: uuid.UUID,
    batch_in: BatchRentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem or current_mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="শুধুমাত্র ম্যানেজার বা মেস ওনার বাড়িভাড়া নির্ধারণ করতে পারবেন",
        )

    stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id)
        .order_by(Membership.joined_at.asc())
    )
    memberships = (await db.execute(stmt)).scalars().all()
    mem_map = {m.user_id: m for m in memberships}

    for item in batch_in.members:
        if item.user_id in mem_map:
            mem = mem_map[item.user_id]
            mem.rent_amount = item.rent_amount
            if item.seat_label is not None:
                mem.seat_label = item.seat_label

    await db.commit()

    return [
        MembershipResponse(
            id=m.id,
            user_id=m.user_id,
            mess_id=m.mess_id,
            role=m.role,
            seat_label=m.seat_label,
            rent_amount=m.rent_amount,
            joined_at=m.joined_at,
            user=m.user,
            user_name=m.user.name if m.user else "সদস্য",
            phone=m.user.phone if m.user else "",
        )
        for m in memberships
    ]

@router.get("/{mess_id}/monthly-rent", response_model=MonthlyRentSummaryResponse)
@router.get("/{mess_id}/monthly-rent/", response_model=MonthlyRentSummaryResponse, include_in_schema=False)
async def get_monthly_rent_summary(
    mess_id: uuid.UUID,
    month: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem:
        raise HTTPException(status_code=403, detail="You are not a member of this mess")

    month = get_safe_month(month)

    # 1. Fetch active memberships
    stmt = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id, Membership.left_at.is_(None))
        .order_by(Membership.joined_at.asc())
    )
    memberships = (await db.execute(stmt)).scalars().all()
    if not memberships:
        raise HTTPException(status_code=400, detail="মেসে কোনো সক্রিয় মেম্বার নেই")

    # 2. Fetch existing MemberMonthlyRent for this month
    rent_stmt = select(MemberMonthlyRent).where(
        MemberMonthlyRent.mess_id == mess_id,
        MemberMonthlyRent.month == month,
    )
    existing_rents = (await db.execute(rent_stmt)).scalars().all()
    rent_map = {r.user_id: r for r in existing_rents}

    # If no records exist for this month, check latest prior month to inherit
    if not existing_rents:
        prior_stmt = (
            select(MemberMonthlyRent)
            .where(MemberMonthlyRent.mess_id == mess_id, MemberMonthlyRent.month < month)
            .order_by(MemberMonthlyRent.month.desc())
        )
        prior_rents = (await db.execute(prior_stmt)).scalars().all()
        prior_map = {r.user_id: r for r in prior_rents}

        # Auto-create records for this month inherited from prior month or membership
        new_records = []
        for m in memberships:
            prior_r = prior_map.get(m.user_id)
            if prior_r:
                base_val = prior_r.base_seat_rent
                vac_val = prior_r.vacancy_adjustment
                is_res = prior_r.is_resident
                s_label = prior_r.seat_label or m.seat_label
                n_text = prior_r.notes
            else:
                base_val = m.rent_amount
                vac_val = 0.0
                is_res = True
                s_label = m.seat_label
                n_text = None

            tot_val = round(base_val + vac_val, 2)
            rec = MemberMonthlyRent(
                mess_id=mess_id,
                user_id=m.user_id,
                month=month,
                seat_label=s_label,
                base_seat_rent=base_val,
                vacancy_adjustment=vac_val,
                total_rent=tot_val,
                is_resident=is_res,
                notes=n_text,
            )
            db.add(rec)
            new_records.append(rec)

        await db.commit()
        for r in new_records:
            await db.refresh(r)
        rent_map = {r.user_id: r for r in new_records}

    # 3. Fetch FixedCosts for this month
    fc_stmt = select(FixedCost).where(
        FixedCost.mess_id == mess_id,
        FixedCost.month == month,
    )
    fixed_costs = (await db.execute(fc_stmt)).scalars().all()

    target_house_rent = sum(fc.amount for fc in fixed_costs if fc.category == FixedCostCategory.RENT)
    shared_utilities = sum(fc.amount for fc in fixed_costs if fc.category != FixedCostCategory.RENT)

    # Active residents count
    resident_count = len([m for m in memberships if rent_map.get(m.user_id) and rent_map[m.user_id].is_resident])
    if resident_count == 0:
        resident_count = len(memberships)

    shared_utility_per_resident = round(shared_utilities / resident_count, 2) if resident_count > 0 else 0.0

    member_items = []
    total_allocated = 0.0

    for m in memberships:
        r = rent_map.get(m.user_id)
        b_rent = r.base_seat_rent if r else m.rent_amount
        v_adj = r.vacancy_adjustment if r else 0.0
        t_rent = r.total_rent if r else round(b_rent + v_adj, 2)
        is_res = r.is_resident if r else True
        s_label = r.seat_label if r else m.seat_label
        notes = r.notes if r else None

        total_allocated += t_rent
        u_share = shared_utility_per_resident if is_res else 0.0
        final_payable = round(t_rent + u_share, 2)

        role_str = "ম্যানেজার" if m.role in [MemberRole.OWNER, MemberRole.MANAGER] else "সদস্য"

        member_items.append(
            MemberMonthlyRentItem(
                user_id=m.user_id,
                user_name=m.user.name if m.user else "সদস্য",
                phone=m.user.phone if m.user else None,
                role=role_str,
                seat_label=s_label,
                base_seat_rent=b_rent,
                vacancy_adjustment=v_adj,
                total_rent=t_rent,
                is_resident=is_res,
                shared_utility_share=u_share,
                final_payable=final_payable,
                notes=notes,
            )
        )

    shortfall = round(total_allocated - target_house_rent, 2)

    return MonthlyRentSummaryResponse(
        month=month,
        target_house_rent=round(target_house_rent, 2),
        total_allocated_rent=round(total_allocated, 2),
        shortfall=shortfall,
        total_shared_utilities=round(shared_utilities, 2),
        shared_utility_per_resident=shared_utility_per_resident,
        active_resident_count=resident_count,
        members=member_items,
    )

@router.patch("/{mess_id}/monthly-rent", response_model=MonthlyRentSummaryResponse)
@router.patch("/{mess_id}/monthly-rent/", response_model=MonthlyRentSummaryResponse, include_in_schema=False)
async def update_monthly_rent_batch(
    mess_id: uuid.UUID,
    payload: MonthlyRentBatchUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem or current_mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="শুধুমাত্র ম্যানেজার বা মেস ওনার বাড়িভাড়া নির্ধারণ করতে পারবেন",
        )

    month = payload.month

    await check_month_not_closed(db, mess_id, month)

    # 1. Target house rent
    if payload.target_house_rent is not None:
        fc_stmt = select(FixedCost).where(
            FixedCost.mess_id == mess_id,
            FixedCost.month == month,
            FixedCost.category == FixedCostCategory.RENT,
        )
        existing_rent_fc = (await db.execute(fc_stmt)).scalar_one_or_none()
        if existing_rent_fc:
            existing_rent_fc.amount = payload.target_house_rent
        else:
            new_fc = FixedCost(
                mess_id=mess_id,
                month=month,
                category=FixedCostCategory.RENT,
                title="বাড়িওয়ালার ফ্ল্যাট ভাড়া",
                amount=payload.target_house_rent,
                split_type="equal",
            )
            db.add(new_fc)

    # 2. Member records
    rent_stmt = select(MemberMonthlyRent).where(
        MemberMonthlyRent.mess_id == mess_id,
        MemberMonthlyRent.month == month,
    )
    existing_rents = (await db.execute(rent_stmt)).scalars().all()
    rent_map = {r.user_id: r for r in existing_rents}

    for item in payload.members:
        rec = rent_map.get(item.user_id)
        tot_val = round(item.base_seat_rent + item.vacancy_adjustment, 2)
        if rec:
            rec.base_seat_rent = item.base_seat_rent
            rec.vacancy_adjustment = item.vacancy_adjustment
            rec.total_rent = tot_val
            rec.is_resident = item.is_resident
            if item.seat_label is not None:
                rec.seat_label = item.seat_label
            if item.notes is not None:
                rec.notes = item.notes
        else:
            rec = MemberMonthlyRent(
                mess_id=mess_id,
                user_id=item.user_id,
                month=month,
                seat_label=item.seat_label,
                base_seat_rent=item.base_seat_rent,
                vacancy_adjustment=item.vacancy_adjustment,
                total_rent=tot_val,
                is_resident=item.is_resident,
                notes=item.notes,
            )
            db.add(rec)

    await db.commit()

    return await get_monthly_rent_summary(
        mess_id=mess_id,
        month=month,
        current_user=current_user,
        db=db,
    )

@router.post("/{mess_id}/monthly-rent/distribute-shortfall", response_model=MonthlyRentSummaryResponse)
@router.post("/{mess_id}/monthly-rent/distribute-shortfall/", response_model=MonthlyRentSummaryResponse, include_in_schema=False)
async def distribute_rent_shortfall(
    mess_id: uuid.UUID,
    payload: DistributeShortfallRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem or current_mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="শুধুমাত্র ম্যানেজার বা মেস ওনার খালি সিটের ঘাটতি বণ্টন করতে পারবেন",
        )

    month = payload.month

    await check_month_not_closed(db, mess_id, month)

    rent_stmt = select(MemberMonthlyRent).where(
        MemberMonthlyRent.mess_id == mess_id,
        MemberMonthlyRent.month == month,
    )
    existing_rents = (await db.execute(rent_stmt)).scalars().all()
    if not existing_rents:
        # Populate if not yet
        await get_monthly_rent_summary(mess_id=mess_id, month=month, current_user=current_user, db=db)
        existing_rents = (await db.execute(rent_stmt)).scalars().all()

    # Get target house rent from FixedCost
    fc_stmt = select(FixedCost).where(
        FixedCost.mess_id == mess_id,
        FixedCost.month == month,
        FixedCost.category == FixedCostCategory.RENT,
    )
    fixed_costs = (await db.execute(fc_stmt)).scalars().all()
    target_rent = sum(fc.amount for fc in fixed_costs)

    # Sum of base seat rents
    total_base = sum(r.base_seat_rent for r in existing_rents)
    deficit = max(0.0, target_rent - total_base)

    if deficit <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{month} মাসে বাড়িভাড়ার কোনো ঘাটতি নেই (মোট ভাড়া: ৳{target_rent}, মোট সিট ভাড়া: ৳{total_base})। ঘাটতি বণ্টন প্রযোজ্য নয়।",
        )

    residents = [r for r in existing_rents if r.is_resident]
    if not residents:
        residents = existing_rents

    if payload.mode == "equal":
        share_per_resident = round(deficit / len(residents), 2) if len(residents) > 0 else 0.0
        for r in existing_rents:
            if r.is_resident:
                r.vacancy_adjustment = share_per_resident
                r.total_rent = round(r.base_seat_rent + share_per_resident, 2)
                r.notes = "খালি সিটের সমবণ্টন সমন্বয়"
            else:
                r.vacancy_adjustment = 0.0
                r.total_rent = r.base_seat_rent
    elif payload.mode == "custom":
        if not payload.adjustments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="কাস্টম মোডের জন্য মেম্বারদের অ্যাডজাস্টমেন্ট প্রদান করা আবশ্যক।",
            )
        total_custom_adj = round(sum(float(v) for v in payload.adjustments.values()), 2)
        if abs(total_custom_adj - round(deficit, 2)) > 1.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"কাস্টম অ্যাডজাস্টমেন্টের যোগফল (৳{total_custom_adj}) মোট ঘাটতির (৳{round(deficit, 2)}) সমান হতে হবে।",
            )
        for r in existing_rents:
            uid_str = str(r.user_id)
            if uid_str in payload.adjustments:
                adj = float(payload.adjustments[uid_str])
                r.vacancy_adjustment = adj
                r.total_rent = round(r.base_seat_rent + adj, 2)
                r.notes = "কাস্টম ঘাটতি সমন্বয়"

    await db.commit()

    return await get_monthly_rent_summary(mess_id=mess_id, month=month, current_user=current_user, db=db)


@router.patch("/{mess_id}/members/{user_id}", response_model=MembershipResponse)
@router.patch("/{mess_id}/members/{user_id}/", response_model=MembershipResponse, include_in_schema=False)
async def update_member_role(
    mess_id: uuid.UUID,
    user_id: uuid.UUID,
    role_in: MembershipRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem or current_mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or managers can change member roles",
        )

    target_result = await db.execute(
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.mess_id == mess_id, Membership.user_id == user_id)
    )
    target_mem = target_result.scalar_one_or_none()
    if not target_mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this mess",
        )

    if current_mem.role == MemberRole.MANAGER:
        if target_mem.role in [MemberRole.OWNER, MemberRole.MANAGER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot modify roles of owner or other managers",
            )
        if role_in.role == MemberRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the owner can transfer ownership",
            )

    target_mem.role = role_in.role
    if role_in.seat_label is not None:
        target_mem.seat_label = role_in.seat_label
    if role_in.rent_amount is not None:
        target_mem.rent_amount = role_in.rent_amount

    await db.commit()
    await db.refresh(target_mem)

    return MembershipResponse(
        id=target_mem.id,
        user_id=target_mem.user_id,
        mess_id=target_mem.mess_id,
        role=target_mem.role,
        seat_label=target_mem.seat_label,
        rent_amount=target_mem.rent_amount,
        joined_at=target_mem.joined_at,
        user=target_mem.user,
        user_name=target_mem.user.name if target_mem.user else "সদস্য",
        phone=target_mem.user.phone if target_mem.user else "",
    )

@router.get("/{mess_id}/meal-rules")
async def get_meal_rules(
    mess_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="আপনি এই মেসের সদস্য নন",
        )

    mess_result = await db.execute(select(Mess).where(Mess.id == mess_id))
    mess = mess_result.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="মেস পাওয়া যায়নি")

    defaults = {
        "breakfast_unit": 0.5,
        "breakfast_cutoff_time": "22:00",
        "breakfast_cutoff_prev_day": True,
        "lunch_cutoff_time": "09:00",
        "dinner_cutoff_time": "17:00",
        "allow_guest_meals": True,
        "max_guest_per_meal": 3,
    }
    rules = dict(defaults)
    if mess.meal_rules:
        rules.update(mess.meal_rules)

    return rules

@router.patch("/{mess_id}/meal-rules")
async def update_meal_rules(
    mess_id: uuid.UUID,
    rules_in: MealRulesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mem_result = await db.execute(
        select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == current_user.id)
    )
    current_mem = mem_result.scalar_one_or_none()
    if not current_mem or current_mem.role not in [MemberRole.OWNER, MemberRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="শুধুমাত্র মেস ম্যানেজার বা মালিক মিল রুলস পরিবর্তন করতে পারবেন",
        )

    mess_result = await db.execute(select(Mess).where(Mess.id == mess_id))
    mess = mess_result.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess not found")

    current_rules = dict(mess.meal_rules or {})
    for field, val in rules_in.model_dump(exclude_unset=True).items():
        if val is not None:
            current_rules[field] = val

    mess.meal_rules = current_rules
    attributes.flag_modified(mess, "meal_rules")

    await db.commit()
    await db.refresh(mess)
    return {"message": "মিল রুলস সফলভাবে আপডেট হয়েছে", "meal_rules": mess.meal_rules}

