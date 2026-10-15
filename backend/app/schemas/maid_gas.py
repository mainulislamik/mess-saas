import uuid
from datetime import datetime, date as date_type
from typing import Optional, List
from pydantic import BaseModel, Field

class MaidAttendanceCreate(BaseModel):
    date: date_type
    maid_name: str = Field("খালা / বুয়া", min_length=1, max_length=100)
    is_present: bool = True
    daily_wage: float = 100.0
    advance_paid: float = 0.0
    notes: Optional[str] = None

class MaidAttendanceOut(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    date: date_type
    maid_name: str
    is_present: bool
    daily_wage: float
    advance_paid: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class GasLogCreate(BaseModel):
    cylinder_name: str = Field("এলপি গ্যাস সিলিন্ডার (১২ কেজি)", min_length=1, max_length=100)
    installed_date: date_type
    expected_days: int = 25
    cost: float = 1450.0

class GasLogOut(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    cylinder_name: str
    installed_date: date_type
    expected_days: int
    cost: float
    is_active: bool
    finished_date: Optional[date_type]
    days_elapsed: int
    days_remaining: int
    percentage_used: float
    status: str # "normal" | "warning" | "exhausted"

    class Config:
        from_attributes = True
