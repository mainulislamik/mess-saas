import uuid
from datetime import datetime, date as date_type
from typing import Optional
from sqlalchemy import Float, Boolean, Date, DateTime, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    
    breakfast: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    lunch: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    dinner: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_off: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    mess = relationship("Mess")
    user = relationship("User")

    @property
    def total_meals(self) -> float:
        if self.is_off:
            return 0.0
        return round(self.breakfast + self.lunch + self.dinner, 2)

    __table_args__ = (
        UniqueConstraint("mess_id", "user_id", "date", name="uq_mess_user_date_meal"),
    )
