import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Float, Boolean, DateTime, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class MemberMonthlyRent(Base):
    __tablename__ = "member_monthly_rents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # Format: YYYY-MM
    
    seat_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    base_seat_rent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, server_default="0.0")
    vacancy_adjustment: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, server_default="0.0")
    total_rent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, server_default="0.0")
    is_resident: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    mess = relationship("Mess")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("mess_id", "user_id", "month", name="uq_member_monthly_rent"),
    )
