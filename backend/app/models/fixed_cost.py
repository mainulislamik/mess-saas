import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Float, DateTime, String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
from app.models.enums import FixedCostCategory, SplitType

class FixedCost(Base):
    __tablename__ = "fixed_costs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # Format: YYYY-MM
    category: Mapped[FixedCostCategory] = mapped_column(SQLEnum(FixedCostCategory, name="fixedcostcategory"), default=FixedCostCategory.OTHER, nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    split_type: Mapped[SplitType] = mapped_column(SQLEnum(SplitType, name="splittype"), default=SplitType.EQUAL, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    mess = relationship("Mess")
