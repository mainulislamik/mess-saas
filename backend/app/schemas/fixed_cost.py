import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import FixedCostCategory, SplitType

class FixedCostCreate(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format")
    category: FixedCostCategory = FixedCostCategory.OTHER
    title: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0, description="Amount in BDT (৳)")
    split_type: SplitType = SplitType.EQUAL
    notes: Optional[str] = None

class FixedCostResponse(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    month: str
    category: FixedCostCategory
    title: str
    amount: float
    split_type: SplitType
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FixedCostMonthlySummary(BaseModel):
    month: str
    total_fixed_cost: float
    items: List[FixedCostResponse]
