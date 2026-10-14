import uuid
from typing import Optional, List, Any
from pydantic import BaseModel

class DashboardStats(BaseModel):
    mess_id: uuid.UUID
    mess_name: str
    my_role: str
    month: str
    today_date: str
    today_total_meals: float
    today_my_meals: float
    month_total_meals: float
    month_total_bazar: float
    month_total_deposit: float
    month_total_fixed_cost: float
    estimated_meal_rate: float
    my_month_meals: float
    my_estimated_meal_cost: float
    my_fixed_cost_share: float
    my_total_deposit: float
    my_balance: float  # my_deposit - (my_meal_cost + my_fixed_share)
    active_member_count: int
    recent_bazars: List[Any] = []
    recent_deposits: List[Any] = []

class TodayMealDetail(BaseModel):
    date: str
    breakfast: float
    lunch: float
    dinner: float
    is_off: bool
    total_meals: float
    dinner_cutoff_time: str = "17:00"
    can_edit_dinner: bool = True

class MemberPersonalSummary(BaseModel):
    mess_id: uuid.UUID
    mess_name: str
    user_id: uuid.UUID
    user_name: str
    phone: str
    seat_label: Optional[str] = None
    my_role: str
    month: str
    
    # Financial Cards
    my_total_deposit: float
    my_month_meals: float
    estimated_meal_rate: float
    my_meal_cost: float
    my_fixed_cost_share: float
    total_personal_cost: float
    net_balance: float  # my_total_deposit - total_personal_cost (>0 surplus, <0 due)
    
    # Mess wide overview (context for member)
    mess_total_meals: float
    mess_total_bazar: float
    mess_total_deposit: float
    active_member_count: int
    
    # Daily interactive meal
    today: TodayMealDetail
    
    # Recent items
    my_deposits: List[Any] = []
    recent_bazars: List[Any] = []
