import uuid
from datetime import datetime, date as date_type
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.enums import FixedCostCategory, SplitType

class FixedCostCreate(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format")
    category: FixedCostCategory = FixedCostCategory.OTHER
    title: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0, description="Amount in BDT (৳)")
    split_type: SplitType = SplitType.EQUAL
    sub_type: Optional[str] = None
    cost_date: Optional[date_type] = None
    billing_date: Optional[date_type] = None
    meta_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class FixedCostUpdate(BaseModel):
    category: Optional[FixedCostCategory] = None
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    split_type: Optional[SplitType] = None
    sub_type: Optional[str] = None
    cost_date: Optional[date_type] = None
    billing_date: Optional[date_type] = None
    meta_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class FixedCostResponse(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    month: str
    category: FixedCostCategory
    title: str
    amount: float
    split_type: SplitType
    sub_type: Optional[str] = None
    cost_date: Optional[date_type] = None
    billing_date: Optional[date_type] = None
    meta_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FixedCostMonthlySummary(BaseModel):
    month: str
    total_fixed_cost: float
    total_house_rent: float = 0.0
    total_shared_utilities: float = 0.0
    shared_utility_per_member: float = 0.0
    active_member_count: int = 0
    category_breakdown: Dict[str, float] = {}
    items: List[FixedCostResponse]
