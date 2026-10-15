import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
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
    rent_amount: float = 0.0
    joined_at: datetime
    left_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    user_name: Optional[str] = None
    phone: Optional[str] = None

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
    meal_rules: Optional[dict] = None

    class Config:
        from_attributes = True

class MessDetailResponse(MessResponse):
    memberships: List[MembershipResponse] = []

class MealRulesUpdate(BaseModel):
    breakfast_unit: Optional[float] = None
    breakfast_cutoff_time: Optional[str] = None
    breakfast_cutoff_prev_day: Optional[bool] = None
    lunch_cutoff_time: Optional[str] = None
    dinner_cutoff_time: Optional[str] = None
    allow_guest_meals: Optional[bool] = None
    max_guest_per_meal: Optional[int] = None

class JoinMessRequest(BaseModel):
    code: str
    seat_label: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    role: MemberRole
    seat_label: Optional[str] = None
    rent_amount: Optional[float] = None

MembershipRoleUpdate = RoleUpdateRequest

class MemberRentItem(BaseModel):
    user_id: uuid.UUID
    rent_amount: float = Field(ge=0)
    seat_label: Optional[str] = None

class BatchRentUpdateRequest(BaseModel):
    members: List[MemberRentItem]

class InviteCodeResponse(BaseModel):
    invite_code: str
    mess_id: uuid.UUID
    mess_name: str
