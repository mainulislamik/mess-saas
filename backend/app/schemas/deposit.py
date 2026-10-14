import uuid
from datetime import date as date_type, datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import DepositMethod

class DepositCreate(BaseModel):
    user_id: uuid.UUID
    amount: float = Field(gt=0, description="Amount in BDT (৳)")
    date: date_type
    method: DepositMethod = DepositMethod.CASH
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

class DepositResponse(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    user_id: uuid.UUID
    user_name: Optional[str] = None
    amount: float
    date: date_type
    method: DepositMethod
    transaction_id: Optional[str] = None
    is_verified: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DepositMonthlySummary(BaseModel):
    month: str
    total_deposit: float
    items: list[DepositResponse]
