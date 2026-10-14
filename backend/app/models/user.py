import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(150), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owned_messes: Mapped[List["Mess"]] = relationship("Mess", back_populates="owner", foreign_keys="Mess.owner_id")
    memberships: Mapped[List["Membership"]] = relationship("Membership", back_populates="user", cascade="all, delete-orphan")
