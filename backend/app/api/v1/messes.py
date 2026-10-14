import secrets
import string
import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.enums import MemberRole
from app.core.deps import get_current_user
from app.schemas.mess import (
    MessCreate,
    MessUpdate,
    MessResponse,
    MessDetailResponse,
    InviteCodeResponse,
    JoinMessRequest,
    MembershipResponse,
    MembershipRoleUpdate,
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
            joined_at=m.joined_at,
            user=m.user,
        )
        for m in memberships
    ]

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

    await db.commit()
    await db.refresh(target_mem)

    return MembershipResponse(
        id=target_mem.id,
        user_id=target_mem.user_id,
        mess_id=target_mem.mess_id,
        role=target_mem.role,
        seat_label=target_mem.seat_label,
        joined_at=target_mem.joined_at,
        user=target_mem.user,
    )
