import uuid
from datetime import datetime, date as date_type
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MealPollOptionOut(BaseModel):
    id: uuid.UUID
    option_text: str
    bazar_suggestion: Optional[str] = None
    vote_count: int = 0
    voter_names: List[str] = []

    model_config = {"from_attributes": True}

class MealPollCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    target_date: date_type
    options: List[Dict[str, str]] = Field(..., min_length=2) # [{"option_text": "...", "bazar_suggestion": "..."}]

class MealPollOut(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    title: str
    target_date: date_type
    status: str
    created_by_name: str
    created_at: datetime
    options: List[MealPollOptionOut]
    total_votes: int
    user_voted_option_id: Optional[uuid.UUID] = None
    winning_option: Optional[MealPollOptionOut] = None

    model_config = {"from_attributes": True}

class MealPollVoteRequest(BaseModel):
    option_id: uuid.UUID

class WeeklyRoutineUpdate(BaseModel):
    schedule_json: str # JSON representation of the 7-day routine

class WeeklyRoutineOut(BaseModel):
    mess_id: uuid.UUID
    schedule_json: str
    updated_at: datetime

    model_config = {"from_attributes": True}
