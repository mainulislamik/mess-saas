import uuid
from typing import Optional, List, Dict
from pydantic import BaseModel

class MasterSheetDayCell(BaseModel):
    day: int
    total: float
    is_off: bool = False
    breakfast: float = 0.0
    lunch: float = 0.0
    dinner: float = 0.0
    guest_meals: float = 0.0

class MasterSheetMember(BaseModel):
    user_id: uuid.UUID
    name: str
    phone: Optional[str] = None
    seat_label: Optional[str] = None
    role: str = "member"
    daily_meals: Dict[int, float]  # day number (1..31) -> total meals
    total_breakfast: float = 0.0
    total_lunch: float = 0.0
    total_dinner: float = 0.0
    total_guest: float = 0.0
    total_meals: float = 0.0
    meal_cost: float = 0.0
    fixed_cost_share: float = 0.0
    total_cost: float = 0.0
    total_deposit: float = 0.0
    balance: float = 0.0  # deposit - total_cost (>0 = refund, <0 = due)
    status: str = "পরিশোধিত"  # "ফেরত পাবেন", "বকেয়া", "পরিশোধিত"

class MasterSheetDailyTotal(BaseModel):
    day: int
    date: str
    total_meals: float

class MasterSheetKPIs(BaseModel):
    total_meals: float
    total_bazar: float
    meal_rate: float
    total_deposits: float
    total_fixed_cost: float
    fixed_cost_per_member: float
    cash_in_hand: float  # total_deposits - total_bazar - total_fixed_cost (drawer balance)
    total_due: float
    total_surplus: float

class MasterSheetBazarItem(BaseModel):
    id: uuid.UUID
    date: str
    user_id: Optional[uuid.UUID] = None
    user_name: str
    items: str
    amount: float

class MasterSheetFixedCostItem(BaseModel):
    id: uuid.UUID
    category: str
    title: str
    amount: float
    split_type: str

class MasterSheetResponse(BaseModel):
    mess_id: uuid.UUID
    mess_name: str
    month: str
    days_in_month: int
    kpis: MasterSheetKPIs
    members: List[MasterSheetMember]
    daily_totals: List[MasterSheetDailyTotal]
    bazars: List[MasterSheetBazarItem]
    fixed_costs: List[MasterSheetFixedCostItem]
