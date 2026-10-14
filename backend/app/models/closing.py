import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Float, Integer, Boolean, DateTime, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.session import Base

class MonthlyClosing(Base):
    __tablename__ = "monthly_closings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # Format: YYYY-MM

    total_bazar: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_meals: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    meal_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_fixed_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    member_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fixed_cost_per_member: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    summary_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    closed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    closed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    mess = relationship("Mess")
    closer = relationship("User")

    __table_args__ = (
        UniqueConstraint("mess_id", "month", name="uq_mess_month_closing"),
    )
