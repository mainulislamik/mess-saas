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
