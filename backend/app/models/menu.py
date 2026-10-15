import uuid
from datetime import datetime, date as date_type
from typing import Optional, List
from sqlalchemy import String, Date, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class MealPoll(Base):
    __tablename__ = "meal_polls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    options: Mapped[List["MealPollOption"]] = relationship("MealPollOption", back_populates="poll", cascade="all, delete-orphan", lazy="selectin")
    created_by = relationship("User")

class MealPollOption(Base):
    __tablename__ = "meal_poll_options"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poll_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meal_polls.id", ondelete="CASCADE"), nullable=False, index=True)
    option_text: Mapped[str] = mapped_column(String(255), nullable=False)
    bazar_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    poll: Mapped["MealPoll"] = relationship("MealPoll", back_populates="options")
    votes: Mapped[List["MealPollVote"]] = relationship("MealPollVote", back_populates="option", cascade="all, delete-orphan", lazy="selectin")

class MealPollVote(Base):
    __tablename__ = "meal_poll_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poll_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meal_polls.id", ondelete="CASCADE"), nullable=False, index=True)
    option_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meal_poll_options.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    voted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    option: Mapped["MealPollOption"] = relationship("MealPollOption", back_populates="votes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("poll_id", "user_id", name="uq_poll_user_vote"),
    )

class WeeklyMenuRoutine(Base):
    __tablename__ = "weekly_menu_routines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mess_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messes.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    schedule_json: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
