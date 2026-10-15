import uuid
from datetime import date as date_type, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class BazarCreate(BaseModel):
    user_id: uuid.UUID  # shopper
    date: date_type
    amount: float = Field(gt=0, description="Amount in BDT (৳)")
    items: str = Field(min_length=2, description="List of items shopped")
    receipt_url: Optional[str] = None
    notes: Optional[str] = None

class BazarResponse(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    user_id: uuid.UUID
    user_name: Optional[str] = None
    date: date_type
    amount: float
    items: str
    receipt_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BazarMonthlySummary(BaseModel):
    month: str
    total_bazar: float
    total_bazar_amount: Optional[float] = None
    bazar_count: int
    items: list[BazarResponse]
    bazars: Optional[list[BazarResponse]] = None

class BazarParsedItem(BaseModel):
    item: str
    amount: float

class BazarQuickParseRequest(BaseModel):
    text: str

class BazarQuickParseResponse(BaseModel):
    items: List[BazarParsedItem]
    total_amount: float
    formatted_description: str

class BazarPriceTrendItem(BaseModel):
    item_name: str
    frequency: int
    last_price: float
    avg_price: float
    price_change: str  # "stable", "up", "down"
