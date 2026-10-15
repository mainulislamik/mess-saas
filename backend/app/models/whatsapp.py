import uuid
from datetime import datetime, date as date_type
from typing import Optional, List
from sqlalchemy import String, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class WhatsAppConfig(Base):
    __tablename__ = "whatsapp_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    whatsapp_group_jid: Mapped[str] = mapped_column(String(100), default="120363041234567890@g.us", nullable=False)
    enable_nightly_digest: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    enable_dues_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    mess = relationship("Mess")
