import uuid
from datetime import datetime, date as date_type
from typing import Optional, List
from sqlalchemy import String, Date, DateTime, ForeignKey, Float, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class MaidAttendance(Base):
    __tablename__ = "maid_attendances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    maid_name: Mapped[str] = mapped_column(String(100), default="খালা / বুয়া", nullable=False)
    is_present: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    daily_wage: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    advance_paid: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    mess = relationship("Mess")

class GasLog(Base):
    __tablename__ = "gas_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    cylinder_name: Mapped[str] = mapped_column(String(100), default="এলপি গ্যাস সিলিন্ডার (১২ কেজি)", nullable=False)
    installed_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    expected_days: Mapped[int] = mapped_column(Integer, default=25, nullable=False) # e.g. 25 days avg
    cost: Mapped[float] = mapped_column(Float, default=1450.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    finished_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    mess = relationship("Mess")
