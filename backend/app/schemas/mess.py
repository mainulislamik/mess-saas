import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.enums import MemberRole, PlanType
from app.schemas.user import UserResponse

class MessBase(BaseModel):
    name: str
    district: str
    thana: str
    area: str
    address: Optional[str] = None

class MessCreate(MessBase):
    seat_label: Optional[str] = None  # optional initial seat label for owner

class MessUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    thana: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class MembershipResponse(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    user_id: uuid.UUID
    role: MemberRole
    seat_label: Optional[str] = None
    joined_at: datetime
    left_at: Optional[datetime] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class MessResponse(MessBase):
    id: uuid.UUID
    slug: str
    owner_id: uuid.UUID
    plan: PlanType
    invite_code: str
    is_active: bool
    created_at: datetime
    my_role: Optional[MemberRole] = None

    class Config:
        from_attributes = True

class MessDetailResponse(MessResponse):
    memberships: List[MembershipResponse] = []

class JoinMessRequest(BaseModel):
    code: str
    seat_label: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    role: MemberRole
    seat_label: Optional[str] = None

MembershipRoleUpdate = RoleUpdateRequest

class InviteCodeResponse(BaseModel):
    invite_code: str
    mess_id: uuid.UUID
    mess_name: str
