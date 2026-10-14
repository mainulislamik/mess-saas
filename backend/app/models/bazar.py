import uuid
from datetime import datetime, date as date_type
from typing import Optional
from sqlalchemy import Float, Date, DateTime, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class Bazar(Base):
    __tablename__ = "bazars"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    items: Mapped[str] = mapped_column(Text, nullable=False)  # item names & details
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    mess = relationship("Mess")
    user = relationship("User")
