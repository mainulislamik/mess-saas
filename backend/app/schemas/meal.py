import uuid
from datetime import date as date_type, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class MealItemBase(BaseModel):
    breakfast: float = Field(default=0.0, ge=0.0, le=5.0)
    lunch: float = Field(default=1.0, ge=0.0, le=5.0)
    dinner: float = Field(default=1.0, ge=0.0, le=5.0)
    guest_breakfast: float = Field(default=0.0, ge=0.0, le=4.0)
    guest_lunch: float = Field(default=0.0, ge=0.0, le=4.0)
    guest_dinner: float = Field(default=0.0, ge=0.0, le=4.0)
    is_off: bool = False
    notes: Optional[str] = None

class MealUserItem(BaseModel):
    user_id: uuid.UUID
    breakfast: float = Field(default=0.0, ge=0.0, le=5.0)
    lunch: float = Field(default=1.0, ge=0.0, le=5.0)
    dinner: float = Field(default=1.0, ge=0.0, le=5.0)
    guest_breakfast: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    guest_lunch: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    guest_dinner: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    is_off: bool = False
    notes: Optional[str] = None

class MealBatchUpdate(BaseModel):
    date: date_type
    meals: List[MealUserItem]

class MealSelfUpdate(MealItemBase):
    date: date_type

class MealResponse(MealItemBase):
    id: uuid.UUID
    mess_id: uuid.UUID
    user_id: uuid.UUID
    date: date_type
    total_meals: float
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MemberMealSummary(BaseModel):
    user_id: uuid.UUID
    user_name: str
    phone: Optional[str] = None
    seat_label: Optional[str] = None
    breakfast_count: float
    lunch_count: float
    dinner_count: float
    guest_meals: float = 0.0
    total_meals: float

class DailyMealMatrix(BaseModel):
    date: date_type
    total_day_meals: float
    members: List[MealResponse]

class MealEmergencyVoidRequest(BaseModel):
    date: date_type
    slot: str = Field(..., pattern="^(breakfast|lunch|dinner|all)$")
    reason: str = Field("bua_absent", description="bua_absent, no_gas, water_issue, custom")
    custom_reason: Optional[str] = None
    action: str = Field("zero_out", pattern="^(zero_out|hotel_food)$")

class MealEmergencyVoidResponse(BaseModel):
    date: date_type
    slot: str
    action: str
    reason_text: str
    affected_members_count: int
    message: str
