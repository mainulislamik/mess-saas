import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Float, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
from app.models.enums import PlanType

class Mess(Base):
    __tablename__ = "messes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    district: Mapped[str] = mapped_column(String(80), nullable=False)
    thana: Mapped[str] = mapped_column(String(80), nullable=False)
    area: Mapped[str] = mapped_column(String(120), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    plan: Mapped[PlanType] = mapped_column(SQLEnum(PlanType, name="plantype"), default=PlanType.FREE, nullable=False)
    invite_code: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    monthly_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    features: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)
    meal_rules: Mapped[dict] = mapped_column(
        JSON,
        default=lambda: {
            "breakfast_unit": 0.5,
            "breakfast_cutoff_time": "22:00",
            "breakfast_cutoff_prev_day": True,
            "lunch_cutoff_time": "09:00",
            "dinner_cutoff_time": "17:00",
            "allow_guest_meals": True,
            "max_guest_per_meal": 3,
        },
        nullable=False,
        server_default='{"breakfast_unit":0.5,"breakfast_cutoff_time":"22:00","breakfast_cutoff_prev_day":true,"lunch_cutoff_time":"09:00","dinner_cutoff_time":"17:00","allow_guest_meals":true,"max_guest_per_meal":3}',
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_messes", foreign_keys=[owner_id])
    memberships: Mapped[List["Membership"]] = relationship("Membership", back_populates="mess", cascade="all, delete-orphan")
