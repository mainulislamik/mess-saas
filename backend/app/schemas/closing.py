import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class MemberClosingSummary(BaseModel):
    user_id: uuid.UUID
    user_name: str
    phone: Optional[str] = None
    seat_label: Optional[str] = None
    total_meals: float
    meal_rate: float
    meal_cost: float
    fixed_cost: float
    total_cost: float
    total_deposit: float
    balance: float  # deposit - total_cost (negative = due, positive = refund)
    status: str     # "বাকি" (DUE), "ফেরত" (REFUND), "পরিশোধিত" (PAID)

class MonthlyClosingPreview(BaseModel):
    mess_id: uuid.UUID
    month: str
    total_bazar: float
    total_meals: float
    meal_rate: float
    total_fixed_cost: float
    member_count: int
    fixed_cost_per_member: float
    members: List[MemberClosingSummary]
    member_summaries: Optional[List[MemberClosingSummary]] = None
    is_closed: bool = False
    formula_explanation: str

class MonthlyClosingResponse(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    month: str
    total_bazar: float
    total_meals: float
    meal_rate: float
    total_fixed_cost: float
    member_count: int
    fixed_cost_per_member: float
    summary_data: Dict[str, Any]
    is_closed: bool
    closed_at: datetime

    class Config:
        from_attributes = True
