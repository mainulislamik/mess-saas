from typing import Optional
from pydantic import BaseModel, field_validator
from app.schemas.user import UserResponse, normalize_bd_phone, validate_email_str

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_bd_phone(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_str(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

class LoginRequest(BaseModel):
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_bd_phone(v)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
