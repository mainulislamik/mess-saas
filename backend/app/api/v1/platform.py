import uuid
import os
import shutil
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.meal import Meal
from app.models.bazar import Bazar
from app.models.deposit import Deposit
from app.models.fixed_cost import FixedCost
from app.models.closing import MonthlyClosing
from app.models.platform import PlatformSetting, PlatformAnnouncement, SubscriptionPayment
from app.models.enums import MemberRole, PlanType
from app.core.deps import get_current_superadmin
from app.core.security import create_access_token

router = APIRouter(prefix="/platform", tags=["Platform Super Admin"])

# Schemas
class PlatformOverviewStats(BaseModel):
    total_messes: int
    active_messes: int
    suspended_messes: int
    demo_messes: int
    total_users: int
    active_users: int
    total_meals_recorded: float
    total_bazar_turnover: float
    total_deposits_turnover: float
    total_subscription_revenue: float
    server_metrics: Dict[str, Any]

class SuperMessUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_suspended: Optional[bool] = None
    is_demo: Optional[bool] = None
    plan: Optional[str] = None
    monthly_fee: Optional[float] = None
    features: Optional[Dict[str, Any]] = None

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    is_active: bool = True
    priority: str = "normal"
    expires_at: Optional[datetime] = None

class SettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None

# --- Super Admin Endpoints ---

@router.get("/overview", response_model=PlatformOverviewStats)
async def get_platform_overview(
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    # Mess stats
    total_messes = (await db.execute(select(func.count(Mess.id)))).scalar_one() or 0
    active_messes = (await db.execute(select(func.count(Mess.id)).where(Mess.is_active == True, Mess.is_suspended == False))).scalar_one() or 0
    suspended_messes = (await db.execute(select(func.count(Mess.id)).where(Mess.is_suspended == True))).scalar_one() or 0
    demo_messes = (await db.execute(select(func.count(Mess.id)).where(Mess.is_demo == True))).scalar_one() or 0

    # User stats
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one() or 0

    # Financial and activity stats
    total_meals = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        Meal.breakfast
                        + Meal.guest_breakfast
                        + Meal.lunch
                        + Meal.guest_lunch
                        + Meal.dinner
                        + Meal.guest_dinner
                    ),
                    0.0,
                )
            ).where(Meal.is_off == False)
        )
    ).scalar_one() or 0.0
    total_bazar = (await db.execute(select(func.sum(Bazar.amount)))).scalar_one() or 0.0
    total_deposits = (await db.execute(select(func.sum(Deposit.amount)).where(Deposit.is_verified == True))).scalar_one() or 0.0
    total_rev = (await db.execute(select(func.sum(SubscriptionPayment.amount)).where(SubscriptionPayment.status == "approved"))).scalar_one() or 0.0

    # Server metrics
    disk = shutil.disk_usage("/")
    server_metrics = {
        "status": "healthy",
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_percent": round((disk.used / disk.total) * 100, 1),
        "timestamp": datetime.utcnow().isoformat(),
    }

    return PlatformOverviewStats(
        total_messes=total_messes,
        active_messes=active_messes,
        suspended_messes=suspended_messes,
        demo_messes=demo_messes,
        total_users=total_users,
        active_users=active_users,
        total_meals_recorded=round(total_meals, 2),
        total_bazar_turnover=round(total_bazar, 2),
        total_deposits_turnover=round(total_deposits, 2),
        total_subscription_revenue=round(total_rev, 2),
        server_metrics=server_metrics,
    )

@router.get("/messes")
async def list_all_messes_superadmin(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Mess)
        .options(selectinload(Mess.owner), selectinload(Mess.memberships))
        .order_by(desc(Mess.created_at))
    )
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(Mess.name.ilike(s) | Mess.invite_code.ilike(s) | Mess.district.ilike(s) | Mess.thana.ilike(s))

    if status_filter == "active":
        stmt = stmt.where(Mess.is_active == True, Mess.is_suspended == False)
    elif status_filter == "suspended":
        stmt = stmt.where(Mess.is_suspended == True)
    elif status_filter == "demo":
        stmt = stmt.where(Mess.is_demo == True)

    result = await db.execute(stmt)
    messes = result.scalars().all()

    response = []
    for m in messes:
        response.append({
            "id": str(m.id),
            "name": m.name,
            "district": m.district,
            "thana": m.thana,
            "area": m.area,
            "invite_code": m.invite_code,
            "plan": m.plan.value if hasattr(m.plan, 'value') else str(m.plan),
            "is_active": m.is_active,
            "is_suspended": m.is_suspended,
            "is_demo": m.is_demo,
            "monthly_fee": m.monthly_fee,
            "features": m.features or {},
            "owner": {
                "id": str(m.owner.id),
                "name": m.owner.name,
                "phone": m.owner.phone,
            } if m.owner else None,
            "member_count": len(m.memberships),
            "members_count": len(m.memberships),
            "created_at": m.created_at.isoformat(),
        })
    return response

@router.get("/messes/{mess_id}")
async def get_mess_detail_superadmin(
    mess_id: uuid.UUID,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Mess)
        .options(selectinload(Mess.owner), selectinload(Mess.memberships).selectinload(Membership.user))
        .where(Mess.id == mess_id)
    )
    res = await db.execute(stmt)
    mess = res.scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=404, detail="মেস পাওয়া যায়নি")

    # Financial aggregate for this mess
    total_bazar = (await db.execute(select(func.sum(Bazar.amount)).where(Bazar.mess_id == mess_id))).scalar_one() or 0.0
    total_meals = (await db.execute(select(func.sum(Meal.breakfast * 0.5 + Meal.lunch + Meal.dinner)).where(Meal.mess_id == mess_id))).scalar_one() or 0.0
    total_deposits = (await db.execute(select(func.sum(Deposit.amount)).where(Deposit.mess_id == mess_id, Deposit.is_verified == True))).scalar_one() or 0.0
    total_fixed = (await db.execute(select(func.sum(FixedCost.amount)).where(FixedCost.mess_id == mess_id))).scalar_one() or 0.0

    members = []
    for mem in mess.memberships:
        members.append({
            "membership_id": str(mem.id),
            "user_id": str(mem.user_id),
            "name": mem.user.name if mem.user else "N/A",
            "phone": mem.user.phone if mem.user else "N/A",
            "role": mem.role.value if hasattr(mem.role, 'value') else str(mem.role),
            "seat_label": mem.seat_label,
            "joined_at": mem.joined_at.isoformat(),
        })

    return {
        "id": str(mess.id),
        "name": mess.name,
        "district": mess.district,
        "thana": mess.thana,
        "area": mess.area,
        "address": mess.address,
        "invite_code": mess.invite_code,
        "plan": mess.plan.value if hasattr(mess.plan, 'value') else str(mess.plan),
        "is_active": mess.is_active,
        "is_suspended": mess.is_suspended,
        "is_demo": mess.is_demo,
        "monthly_fee": mess.monthly_fee,
        "features": mess.features or {},
        "owner": {
            "id": str(mess.owner.id),
            "name": mess.owner.name,
            "phone": mess.owner.phone,
        } if mess.owner else None,
        "created_at": mess.created_at.isoformat(),
        "stats": {
            "total_bazar": round(total_bazar, 2),
            "total_meals": round(total_meals, 2),
            "total_deposits": round(total_deposits, 2),
            "total_fixed_cost": round(total_fixed, 2),
            "member_count": len(members),
        },
        "members": members,
    }

@router.patch("/messes/{mess_id}")
async def update_mess_superadmin(
    mess_id: uuid.UUID,
    payload: SuperMessUpdate,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    mess = (await db.execute(select(Mess).where(Mess.id == mess_id))).scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=404, detail="মেস পাওয়া যায়নি")

    if payload.is_active is not None:
        mess.is_active = payload.is_active
    if payload.is_suspended is not None:
        mess.is_suspended = payload.is_suspended
    if payload.is_demo is not None:
        mess.is_demo = payload.is_demo
    if payload.monthly_fee is not None:
        mess.monthly_fee = payload.monthly_fee
    if payload.features is not None:
        f = dict(mess.features or {})
        f.update(payload.features)
        mess.features = f
    if payload.plan is not None:
        try:
            mess.plan = PlanType(payload.plan.lower())
        except Exception:
            pass

    await db.commit()
    return {"message": "মেস কনফিগারেশন সফলভাবে আপডেট হয়েছে", "id": str(mess.id)}

@router.post("/messes/{mess_id}/login-as")
async def superadmin_login_as_mess(
    mess_id: uuid.UUID,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    StockWhisk parity: Super admin can directly impersonate the owner of the mess
    to inspect and troubleshoot issues instantly.
    """
    mess = (await db.execute(select(Mess).where(Mess.id == mess_id))).scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=404, detail="মেস পাওয়া যায়নি")

    owner = (await db.execute(select(User).where(User.id == mess.owner_id))).scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=404, detail="মেসের মালিক পাওয়া যায়নি")

    access_token = create_access_token(
        subject=str(owner.id)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "mess_id": str(mess.id),
        "mess_name": mess.name,
        "owner_name": owner.name,
        "owner_phone": owner.phone,
    }

@router.delete("/messes/{mess_id}")
async def delete_mess_superadmin(
    mess_id: uuid.UUID,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    mess = (await db.execute(select(Mess).where(Mess.id == mess_id))).scalar_one_or_none()
    if not mess:
        raise HTTPException(status_code=404, detail="মেস পাওয়া যায়নি")

    # Cascade delete all related entities
    await db.execute(delete(Meal).where(Meal.mess_id == mess_id))
    await db.execute(delete(Bazar).where(Bazar.mess_id == mess_id))
    await db.execute(delete(Deposit).where(Deposit.mess_id == mess_id))
    await db.execute(delete(FixedCost).where(FixedCost.mess_id == mess_id))
    await db.execute(delete(MonthlyClosing).where(MonthlyClosing.mess_id == mess_id))
    await db.execute(delete(Membership).where(Membership.mess_id == mess_id))
    await db.execute(delete(Mess).where(Mess.id == mess_id))
    await db.commit()

    return {"success": True, "message": f"মেস '{mess.name}' এবং এর সমস্ত ডাটা সফলভাবে মুছে ফেলা হয়েছে"}

@router.get("/users")
async def list_all_users_superadmin(
    search: Optional[str] = Query(None),
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(desc(User.created_at))
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(User.name.ilike(s) | User.phone.ilike(s))

    result = await db.execute(stmt)
    users = result.scalars().all()

    response = []
    for u in users:
        response.append({
            "id": str(u.id),
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "is_active": u.is_active,
            "is_superuser": u.is_superuser,
            "created_at": u.created_at.isoformat(),
        })
    return response

@router.post("/users/{user_id}/toggle-status")
async def toggle_user_active_status(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না")

    user.is_active = not user.is_active
    await db.commit()
    return {"message": f"ইউজার {'সক্রিয়' if user.is_active else 'নিষ্ক্রিয়'} করা হয়েছে", "is_active": user.is_active}

# Announcements
@router.get("/announcements")
async def list_announcements(
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PlatformAnnouncement).order_by(desc(PlatformAnnouncement.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/announcements")
async def create_announcement(
    payload: AnnouncementCreate,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    item = PlatformAnnouncement(
        title=payload.title,
        message=payload.message,
        is_active=payload.is_active,
        priority=payload.priority,
        expires_at=payload.expires_at,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/announcements/{item_id}")
async def delete_announcement(
    item_id: uuid.UUID,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(PlatformAnnouncement).where(PlatformAnnouncement.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="বিজ্ঞপ্তি পাওয়া যায়নি")
    await db.delete(item)
    await db.commit()
    return {"message": "বিজ্ঞপ্তি ডিলিট করা হয়েছে"}

# Platform Settings (bKash/Nagad merchant, pricing, maintenance mode)
@router.get("/settings")
async def get_platform_settings(
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PlatformSetting)
    res = await db.execute(stmt)
    items = res.scalars().all()
    out = {}
    for i in items:
        out[i.key] = {"value": i.value, "description": i.description, "updated_at": i.updated_at.isoformat()}
    return out

@router.post("/settings/{key}")
async def set_platform_setting(
    key: str,
    payload: SettingUpdate,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))).scalar_one_or_none()
    if not item:
        item = PlatformSetting(key=key, value=payload.value, description=payload.description)
        db.add(item)
    else:
        item.value = payload.value
        if payload.description:
            item.description = payload.description
        item.updated_at = datetime.utcnow()

    await db.commit()
    return {"message": f"সেটিংস '{key}' সফলভাবে সংরক্ষিত হয়েছে"}
