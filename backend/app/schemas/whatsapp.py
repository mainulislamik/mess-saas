import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class WhatsAppConfigCreate(BaseModel):
    whatsapp_group_jid: str = Field(..., min_length=5, max_length=100)
    enable_nightly_digest: bool = True
    enable_dues_alerts: bool = True

class WhatsAppConfigOut(BaseModel):
    id: uuid.UUID
    mess_id: uuid.UUID
    whatsapp_group_jid: str
    enable_nightly_digest: bool
    enable_dues_alerts: bool
    created_at: datetime

    class Config:
        from_attributes = True

class WhatsAppDigestPreview(BaseModel):
    group_jid: str
    message_text: str
    recipient_count: int
    status: str
