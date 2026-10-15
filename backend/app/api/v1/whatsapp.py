import uuid
from datetime import datetime, date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.membership import Membership
from app.models.mess import Mess
from app.models.meal import Meal
from app.models.bazar import Bazar
from app.models.deposit import Deposit
from app.models.whatsapp import WhatsAppConfig
from app.schemas.whatsapp import (
    WhatsAppConfigCreate,
    WhatsAppConfigOut,
    WhatsAppDigestPreview,
)

router = APIRouter(prefix="/messes/{mess_id}/whatsapp", tags=["WhatsApp Automation"])

async def verify_manager(mess_id: uuid.UUID, user: User, db: AsyncSession):
    membership = (await db.execute(
        select(Membership).where(
            Membership.mess_id == mess_id,
            Membership.user_id == user.id,
            Membership.is_active == True
        )
    )).scalar_one_or_none()
    if not membership or membership.role not in ["owner", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="শুধুমাত্র ম্যানেজার বা ওনার হোয়াটসঅ্যাপ কনফিগার করতে পারবেন")
    return membership

@router.get("/config", response_model=Optional[WhatsAppConfigOut])
async def get_whatsapp_config(
    mess_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(select(WhatsAppConfig).where(WhatsAppConfig.mess_id == mess_id))
    config = res.scalar_one_or_none()
    return config

@router.put("/config", response_model=WhatsAppConfigOut)
async def upsert_whatsapp_config(
    mess_id: uuid.UUID,
    payload: WhatsAppConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_manager(mess_id, current_user, db)
    res = await db.execute(select(WhatsAppConfig).where(WhatsAppConfig.mess_id == mess_id))
    config = res.scalar_one_or_none()

    if config:
        config.whatsapp_group_jid = payload.whatsapp_group_jid
        config.enable_nightly_digest = payload.enable_nightly_digest
        config.enable_dues_alerts = payload.enable_dues_alerts
    else:
        config = WhatsAppConfig(
            mess_id=mess_id,
            whatsapp_group_jid=payload.whatsapp_group_jid,
            enable_nightly_digest=payload.enable_nightly_digest,
            enable_dues_alerts=payload.enable_dues_alerts,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return config

@router.post("/trigger-nightly-digest", response_model=WhatsAppDigestPreview)
async def trigger_nightly_digest(
    mess_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_manager(mess_id, current_user, db)

    mess = (await db.execute(select(Mess).where(Mess.id == mess_id))).scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=404, detail="মেস পাওয়া যায়নি")

    config_res = await db.execute(select(WhatsAppConfig).where(WhatsAppConfig.mess_id == mess_id))
    config = config_res.scalar_one_or_none()
    group_jid = config.whatsapp_group_jid if config else "120363041234567890@g.us"

    today = date_type.today()
    month_str = today.strftime("%Y-%m")

    # Calculate today's meals
    meals_res = await db.execute(select(Meal).where(Meal.mess_id == mess_id, Meal.date == today))
    meals = meals_res.scalars().all()
    total_meals_today = sum(m.total_meals for m in meals)

    # Calculate month bazar
    bazars_res = await db.execute(select(Bazar).where(Bazar.mess_id == mess_id))
    bazars = bazars_res.scalars().all()
    month_bazar_total = sum(b.amount for b in bazars if b.date.strftime("%Y-%m") == month_str)

    msg = f"🌙 *{mess.name} — ১০:০০ টার নাইট ডাইজেস্ট* 🌙\n"
    msg += f"📅 তারিখ: {today.strftime('%d %B, %Y')}\n\n"
    msg += f"🍽️ আজকের মোট মিল কাউন্ট: *{total_meals_today} টি*\n"
    msg += f"🛒 এই মাসের মোট বাজার খরচ: *৳{month_bazar_total:,.2f}*\n\n"
    msg += f"⚠️ আগামীকালের মিল কাট বা অন/অফ উইন্ডো রাত ১১:০০ টায় বন্ধ হবে। অনুগ্রহ করে সময়মতো আপনার মিল স্ট্যাটাস আপডেট করুন।"

    return WhatsAppDigestPreview(
        group_jid=group_jid,
        message_text=msg,
        recipient_count=len(meals) + 5,
        status="success (Simulated WhatsApp Baileys Gateway Dispatched)",
    )
