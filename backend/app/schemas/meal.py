import uuid
from datetime import date as date_type, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class MealItemBase(BaseModel):
    breakfast: float = Field(default=0.0, ge=0.0, le=5.0)
    lunch: float = Field(default=1.0, ge=0.0, le=5.0)
    dinner: float = Field(default=1.0, ge=0.0, le=5.0)
    guest_breakfast: float = Field(default=0.0, ge=0.0, le=20.0)
    guest_lunch: float = Field(default=0.0, ge=0.0, le=20.0)
    guest_dinner: float = Field(default=0.0, ge=0.0, le=20.0)
    is_off: bool = False
    notes: Optional[str] = None

class MealUserItem(MealItemBase):
    user_id: uuid.UUID

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
