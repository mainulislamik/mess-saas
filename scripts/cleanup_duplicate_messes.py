import asyncio
from app.db.session import AsyncSessionLocal
from app.models.mess import Mess
from app.models.membership import Membership
from app.models.meal import Meal
from app.models.bazar import Bazar
from app.models.deposit import Deposit
from app.models.fixed_cost import FixedCost
from app.models.closing import MonthlyClosing
from sqlalchemy import select, delete

CANONICAL_INVITE_CODE = "JFNYYY"

async def cleanup():
    async with AsyncSessionLocal() as session:
        # Find canonical mess
        res = await session.execute(select(Mess).where(Mess.invite_code == CANONICAL_INVITE_CODE))
        canonical_mess = res.scalar_one_or_none()
        if not canonical_mess:
            print("Canonical mess JFNYYY not found!")
            return

        print(f"Retaining canonical mess: {canonical_mess.name} ({canonical_mess.id}) with code {canonical_mess.invite_code}")

        # Find duplicate messes with name 'ধানমন্ডি শান্তি নিবাস' or 'Dhanmondi Shanti Nibash' whose code is not JFNYYY
        res = await session.execute(
            select(Mess).where(
                Mess.name.in_(["ধানমন্ডি শান্তি নিবাস", "Dhanmondi Shanti Nibash", "Mirpur Bachelor Mess"]),
                Mess.invite_code != CANONICAL_INVITE_CODE
            )
        )
        duplicates = res.scalars().all()
        print(f"Found {len(duplicates)} duplicate/empty messes to purge.")

        for dup in duplicates:
            print(f"Purging mess: {dup.name} ({dup.id}) [Code: {dup.invite_code}]")
            # Delete child records
            await session.execute(delete(Meal).where(Meal.mess_id == dup.id))
            await session.execute(delete(Bazar).where(Bazar.mess_id == dup.id))
            await session.execute(delete(Deposit).where(Deposit.mess_id == dup.id))
            await session.execute(delete(FixedCost).where(FixedCost.mess_id == dup.id))
            await session.execute(delete(MonthlyClosing).where(MonthlyClosing.mess_id == dup.id))
            await session.execute(delete(Membership).where(Membership.mess_id == dup.id))
            await session.execute(delete(Mess).where(Mess.id == dup.id))

        await session.commit()
        print("Cleanup completed successfully!")

if __name__ == "__main__":
    asyncio.run(cleanup())
