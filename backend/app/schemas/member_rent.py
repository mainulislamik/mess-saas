import uuid
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class MemberRentUpdateItem(BaseModel):
    user_id: uuid.UUID
    seat_label: Optional[str] = None
    base_seat_rent: float = Field(default=0.0, ge=0.0)
    vacancy_adjustment: float = Field(default=0.0)
    is_resident: bool = True
    notes: Optional[str] = None

class MemberMonthlyRentItem(BaseModel):
    user_id: uuid.UUID
    user_name: str
    phone: Optional[str] = None
    role: str = "member"
    seat_label: Optional[str] = None
    base_seat_rent: float = 0.0
    vacancy_adjustment: float = 0.0
    total_rent: float = 0.0
    is_resident: bool = True
    shared_utility_share: float = 0.0
    final_payable: float = 0.0
    notes: Optional[str] = None

class MonthlyRentSummaryResponse(BaseModel):
    month: str
    target_house_rent: float
    total_allocated_rent: float
    shortfall: float  # total_allocated_rent - target_house_rent (< 0 means deficit)
    total_shared_utilities: float
    shared_utility_per_resident: float
    active_resident_count: int
    members: List[MemberMonthlyRentItem]

class MonthlyRentBatchUpdateRequest(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    target_house_rent: Optional[float] = None
    members: List[MemberRentUpdateItem]

class DistributeShortfallRequest(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    mode: str = Field("equal", pattern="^(equal|custom)$")
    adjustments: Optional[Dict[str, float]] = None
