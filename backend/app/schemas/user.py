import re
from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator

def normalize_bd_phone(v: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", v)
    if cleaned.startswith("+880"):
        digits = cleaned[4:]
    elif cleaned.startswith("880"):
        digits = cleaned[3:]
    elif cleaned.startswith("0"):
        digits = cleaned[1:]
    else:
        digits = cleaned

    if len(digits) != 10 or not digits.startswith("1"):
        raise ValueError("Invalid Bangladesh mobile number format (must be 01XXXXXXXXX or +8801XXXXXXXXX)")
    return f"+880{digits}"

def validate_email_str(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip().lower()
    if not v:
        return None
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, v):
        raise ValueError("Invalid email address")
    return v

class UserBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_bd_phone(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_str(v)

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    is_superuser: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
