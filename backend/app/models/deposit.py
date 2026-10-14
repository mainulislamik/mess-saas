import uuid
from datetime import datetime, date as date_type
from typing import Optional
from sqlalchemy import Float, Boolean, Date, DateTime, String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
from app.models.enums import DepositMethod

class Deposit(Base):
    __tablename__ = "deposits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    method: Mapped[DepositMethod] = mapped_column(SQLEnum(DepositMethod, name="depositmethod"), default=DepositMethod.CASH, nullable=False)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    mess = relationship("Mess")
    user = relationship("User")
