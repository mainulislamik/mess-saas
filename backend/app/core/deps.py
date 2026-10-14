import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return user

from datetime import date as date_type
import re

def get_safe_month(month: Optional[str] = None) -> str:
    if month and re.match(r"^\d{4}-\d{2}$", month.strip()):
        return month.strip()
    today = date_type.today()
    return f"{today.year:04d}-{today.month:02d}"

def get_safe_date(d: Optional[str] = None) -> date_type:
    if d:
        try:
            return date_type.fromisoformat(d.strip())
        except Exception:
            pass
    return date_type.today()

async def get_membership_for_mess(
    mess_id: uuid.UUID,
    user: User,
    db: AsyncSession,
):
    from app.models.membership import Membership
    stmt = select(Membership).where(Membership.mess_id == mess_id, Membership.user_id == user.id)
    res = await db.execute(stmt)
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this mess",
        )
    return m

