# [House Rent & Utilities Management] Implementation Plan

> **For Hermes:** Use this comprehensive plan to implement the updated House Rent & Utilities ecosystem task-by-task.

**Goal:** Replace the legacy/impractical "বুয়া হাজিরা ও গ্যাস" (Maid Attendance) module with a 100% Bangladesh-authentic "বাড়িভাড়া ও ইউটিলিটি বিল ব্যবস্থাপনা" (House Rent & Utilities Management) system featuring member-wise individual house rent, monthly utility bill tracking (Electricity prepaid/postpaid, Gas cylinder/line/prepaid, WiFi, Waste/Moyla, Water, Maid monthly salary), and seamless auto-sync with the Master Sheet and Monthly Closing engines.

**Architecture:** 
- **Database & Backend:** Add `rent_amount` to `Membership` model with safe Alembic migration; expand `FixedCostCategory` to support all Bangladesh mess bills (`RENT`, `ELECTRICITY`, `GAS`, `WIFI`, `WASTE`, `WATER`, `COOK_MAID`, `OTHER`) with support for utility subtypes (prepaid token, LPG cylinder lifecycle, postpaid bills); update Master Sheet and Closing calculation formulas to calculate individual member cost as `Member's Individual House Rent + (Total Shared Utilities ÷ Active Members)`.
- **Frontend & Navigation:** Upgrade `/dashboard/maid-gas` to modern `/dashboard/rent-utilities` with sidebar update in `DashboardShell.tsx` ("বাড়িভাড়া ও ইউটিলিটি বিল"), top KPI cards, a Member House Rent matrix with inline update, categorized utility bill logger with preset modals, and instant distribution preview.
- **Tech Stack:** Next.js 15 (App Router, Tailwind CSS, Lucide Icons), FastAPI, PostgreSQL 16 (SQLAlchemy 2 Async, Alembic), Redis.

---

## ১. সমস্যা বিশ্লেষণ ও বাস্তবসম্মত প্রেক্ষাপট (Problem Analysis & Context)

### ১.১ বর্তমান পেজের সমস্যাসমূহ (Pain Points of Legacy "বুয়া হাজিরা" Page):
1. **বুয়া হাজিরা মেসের জন্য অবাস্তব:** বাংলাদেশের কোনো ব্যাচেলর মেসে কাজের বুয়া বা খালাকে দিন চুক্তিতে (দৈনিক হাজিরা ও দৈনিক মজুরি) রাখা হয় না। বুয়া বা খালাকে মাসিক ফিক্সড বেতনে (যেমন: ৳২,৫০০ বা ৳৩,০০০) রাখা হয়।
2. **বাড়িভাড়া সমান বণ্টন ভুল হিসাব:** বর্তমানে সিস্টেমে সব ফিক্সড খরচ ও বাসা ভাড়া একসাথে যোগ করে সব মেম্বারের মাঝে সমানভাগে ভাগ করা হচ্ছে (`fixed_cost ÷ member_count`)। অথচ মেসে:
   - কেউ সিঙ্গেল রুমে থাকে (ভাড়া ৳৫,০০০)।
   - কেউ ডাবল সিটের রুমে থাকে (ভাড়া ৳৩,৫০০)।
   - কেউ ৩/৪ জনের বড় রুমে থাকে (ভাড়া ৳২,৮০০)।
   - প্রত্যেকের সিট ও বাসা ভাড়া আলাদা (Per Person Separately)!
3. **ইউটিলিটি বিলের বহুমুখী ধরণ বাদ পড়েছিল:**
   - **বিদ্যুৎ:** অনেকে ডেসকো/নেসকো/পল্লীবিদ্যুৎ প্রিপেইড মিটারে মাসে ২-৩ বার টোকেন রিচার্জ করে, আবার অনেকে পোস্টপেইড মাসিক বিল দেয়।
   - **গ্যাস:** কোনো মেসে এলপিজি গ্যাস সিলিন্ডার লাগে (মেয়াদ ও দিন ট্র্যাকিং সহ), কোনো মেসে সরকারি লাইন গ্যাস বিল ফিক্সড (৳১,০৮০), আবার কোনো মেসে প্রিপেইড কার্ড রিচার্জ।
   - **অন্যান্য বাস্তব বিল:** ময়লা বিল (৳১০০-৩০০), ওয়াইফাই বিল (৳৫০০-১০০০), বুয়ার মাসিক বেতন (৳২,৫০০-৳৩,৫০০), পানি বিল, ফিল্টার পানি ইত্যাদি।

---

## ২. ডেটাবেজ ও গাণিতিক মডেলিং (Data Model & Formula Blueprint)

### ২.১ গাণিতিক সূত্র (Calculation Formulas):
$$\text{মোট শেয়ার্ড ইউটিলিটি (Total Shared Utilities)} = \sum (\text{Electricity} + \text{Gas} + \text{WiFi} + \text{Waste} + \text{Water} + \text{Maid Salary} + \text{Others})$$

$$\text{জনপ্রতি শেয়ার্ড ইউটিলিটি (Shared Utility Per Member)} = \frac{\text{মোট শেয়ার্ড ইউটিলিটি}}{\text{মোট সক্রিয় সদস্য (Active Members)}}$$

$$\text{সদস্যের মোট ফিক্সড ও ভাড়া খরচ (Member Total Fixed Cost)} = \text{সদস্যের নিজস্ব বাড়িভাড়া (Individual Rent)} + \text{জনপ্রতি শেয়ার্ড ইউটিলিটি}$$

$$\text{সদস্যের মোট মেস খরচ (Total Cost)} = (\text{মোট মিল} \times \text{মিল রেট}) + \text{সদস্যের মোট ফিক্সড ও ভাড়া খরচ}$$

$$\text{সদস্যের নিট স্থিতি (Net Balance)} = \text{মোট জমা টাকা} - \text{সদস্যের মোট মেস খরচ}$$

### ২.২ ডেটাবেজ স্কিমা পরিবর্তন:
1. `memberships` টেবিলে নতুন কলাম:
   - `rent_amount`: `Float`, default `0.0`, nullable=False (`server_default='0.0'`)
2. `fixed_costs` মডেলে ক্যাটাগরি ও মেটাডাটা সমর্থন:
   - ক্যাটাগরি এনম: `RENT`, `ELECTRICITY`, `GAS`, `WIFI`, `WASTE`, `WATER`, `COOK_MAID`, `OTHER`
   - ইউটিলিটি সাব-টাইপ ও মেটাডাটা (JSON / nullable columns): `bill_type` (`prepaid_recharge`, `postpaid_bill`, `lpg_cylinder`, `fixed_monthly`), `token_number` (প্রিপেইড মিটারের টোকেন/কার্ড নং), `meter_reading`।

---

## ৩. কাজের পুঙ্খানুপুঙ্খ ধাপসমূহ (Step-by-Step Tasks)

### Task 1: Backend Database Migration — `memberships.rent_amount` & Category Expansion
**Objective:** Add `rent_amount` column to `Membership` model and update `FixedCostCategory` enum with Alembic migration.

**Files:**
- Modify: `backend/app/models/membership.py`
- Modify: `backend/app/models/enums.py`
- Modify: `backend/app/models/fixed_cost.py`
- Create: `backend/alembic/versions/xxxx_add_rent_amount_and_utility_categories.py`
- Test: `backend/tests/test_fixed_costs.py`

**Step 1: Write test for membership rent_amount and fixed cost categories**
```python
def test_membership_rent_amount_default():
    membership = Membership(mess_id=uuid.uuid4(), user_id=uuid.uuid4(), seat_label="Room 1, Bed A", rent_amount=3500.0)
    assert membership.rent_amount == 3500.0
```

**Step 2: Apply model updates and create Alembic migration**
- In `backend/app/models/membership.py`:
  ```python
  rent_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, server_default=sa.text('0.0'))
  ```
- In `backend/app/models/enums.py`:
  ```python
  class FixedCostCategory(str, Enum):
      RENT = "rent"
      ELECTRICITY = "electricity"
      GAS = "gas"
      WIFI = "wifi"
      WASTE = "waste"
      WATER = "water"
      COOK_MAID = "cook_maid"
      OTHER = "other"
  ```

**Step 3: Run migration in docker**
```bash
docker exec -it mess_backend alembic upgrade head
```

**Step 4: Commit**
```bash
git add backend/app/models/ backend/alembic/
git commit -m "feat(backend): add rent_amount to memberships and expand utility categories"
```

---

### Task 2: Backend Dedicated APIs for House Rent & Utilities Management
**Objective:** Create comprehensive endpoints under `/api/v1/messes/{mess_id}/rent-utilities` to view monthly summary, update per-member house rent, and manage monthly utility bills.

**Files:**
- Create: `backend/app/schemas/rent_utilities.py`
- Create: `backend/app/api/v1/rent_utilities.py`
- Modify: `backend/app/api/v1/router.py`
- Test: `backend/tests/test_rent_utilities.py`

**API Contract:**
- `GET /api/v1/messes/{mess_id}/rent-utilities?month=YYYY-MM`:
  - Returns `month`, `total_house_rent`, `total_utilities`, `total_fixed_cost`, `active_members_count`, `utility_share_per_member`
  - Returns `members_rent`: `List[{ user_id, name, phone, seat_label, rent_amount, role }]`
  - Returns `utility_bills`: Categorized bills (Electricity, Gas, WiFi, Waste, Water, Maid, Others)
  - Returns `gas_status`: Active LPG cylinders, remaining days, forecast
- `POST /api/v1/messes/{mess_id}/rent-utilities/members-rent`:
  - Bulk or single update of member seat rents: `items: List[{ user_id: UUID, seat_label: str, rent_amount: float }]`
- `POST /api/v1/messes/{mess_id}/rent-utilities/bills`:
  - Add utility bill: `category`, `title`, `amount`, `bill_type`, `notes`, `month`, `lpg_details`
- `DELETE /api/v1/messes/{mess_id}/rent-utilities/bills/{id}`:
  - Remove utility bill

**Commit**
```bash
git add backend/app/schemas/rent_utilities.py backend/app/api/v1/rent_utilities.py backend/app/api/v1/router.py
git commit -m "feat(api): implement rent and utilities management endpoints"
```

---

### Task 3: Backend Calculation Sync — Master Sheet & Monthly Closing Engines
**Objective:** Update `calculate_monthly_closing_data` in `closings.py` and `master_sheet.py` so that member costs correctly calculate:
`m_fixed_cost = member_rent + (total_shared_utilities / active_members)`.

**Files:**
- Modify: `backend/app/api/v1/closings.py:82-140`
- Modify: `backend/app/api/v1/master_sheet.py:143-170`
- Modify: `backend/app/schemas/master_sheet.py`
- Modify: `backend/app/schemas/closing.py`

**Implementation Logic:**
```python
# 1. Total House Rent = Sum of individual member rent amounts
total_house_rent = sum(m.rent_amount for m in memberships)

# 2. Shared Utilities = All fixed costs for the month where category != 'rent'
shared_utilities_stmt = select(func.coalesce(func.sum(FixedCost.amount), 0.0)).where(
    FixedCost.mess_id == mess_id,
    FixedCost.month == month,
    FixedCost.category != FixedCostCategory.RENT
)
total_shared_utilities = float((await db.execute(shared_utilities_stmt)).scalar() or 0.0)
utility_per_member = round(total_shared_utilities / member_count, 2) if member_count > 0 else 0.0

# 3. Individual Member Fixed Cost
for m in memberships:
    m_rent = m.rent_amount or 0.0
    m_fixed_cost = round(m_rent + utility_per_member, 2)
```

**Commit**
```bash
git add backend/app/api/v1/closings.py backend/app/api/v1/master_sheet.py backend/app/schemas/
git commit -m "fix(calculations): calculate individual house rent and shared utility split in master sheet and closing"
```

---

### Task 4: Frontend Navigation & Route Migration (`DashboardShell.tsx` & `/dashboard/rent-utilities`)
**Objective:** Replace legacy "বুয়া হাজিরা ও গ্যাস" sidebar item with "বাড়িভাড়া ও ইউটিলিটি বিল" (`/dashboard/rent-utilities`) in `DashboardShell.tsx` and provide backward-compatible redirection for `/dashboard/maid-gas`.

**Files:**
- Modify: `frontend/src/components/DashboardShell.tsx`
- Create: `frontend/src/app/dashboard/rent-utilities/page.tsx`
- Modify: `frontend/src/app/dashboard/maid-gas/page.tsx` (Redirect to `/dashboard/rent-utilities`)

**Sidebar Item Specification:**
```tsx
{ 
  href: "/dashboard/rent-utilities", 
  label: "বাড়িভাড়া ও ইউটিলিটি বিল", 
  icon: Home 
}
```

---

### Task 5: Frontend UI — Top KPI Banner & Member House Rent Matrix
**Objective:** Build high-contrast, beautiful UI for managing per-member house rent with seat labels and live total rent counter.

**Files:**
- Create: `frontend/src/app/dashboard/rent-utilities/page.tsx` (Top KPI & Tab 1)

**Features:**
1. **Top KPI Banner (5 Cards):**
   - 🏠 **মোট বাড়িভাড়া:** সকল সদস্যের বাসা ভাড়ার যোগফল।
   - ⚡ **মোট ইউটিলিটি বিল:** চলতি মাসের গ্যাস, বিদ্যুৎ, ওয়াইফাই, ময়লা, পানি ও বুয়ার বেতন।
   - 💰 **মোট মাসিক ফিক্সড খরচ:** বাড়িভাড়া + ইউটিলিটি।
   - 👥 **জনপ্রতি ইউটিলিটি শেয়ার:** মোট ইউটিলিটি ÷ সদস্য সংখ্যা।
   - 🔥 **এলপিজি সিলিন্ডার ট্র্যাকার:** গ্যাস শেষ হওয়ার অবশিষ্ট দিন ও প্রেডিকশন অ্যালার্ট।
2. **Tab 1: "সদস্যভিত্তিক বাড়িভাড়া ও সিট রেট":**
   - Table with Columns: সদস্যের নাম, ফোন, ভূমিকা, সিট/রুমের নাম (Seat Label), মাসিক বাড়িভাড়া (৳), অ্যাকশন।
   - Inline Input / 1-Click Save for updating individual seat rent.
   - Quick bulk-fill preset (e.g. "সবার জন্য একই ভাড়া সেট করুন") বা "কাস্টম সিট ভাড়া সেট করুন"।

---

### Task 6: Frontend UI — Monthly Utility Bills & Charges Manager
**Objective:** Build Tab 2 for logging and tracking all monthly utility bills (Electricity prepaid/postpaid, Gas cylinder/line/prepaid, WiFi, Waste, Water, Maid salary, Others).

**Files:**
- Modify: `frontend/src/app/dashboard/rent-utilities/page.tsx` (Tab 2 & Modals)

**Features:**
1. **বিল ক্যাটাগরি ভিত্তিক সুসংগঠিত কার্ড ভিউ ও টেবিল:**
   - ⚡ **বিদ্যুৎ বিল:** 
     * প্রিপেইড কার্ড রিচার্জ: একাধিক টোকেন এন্ট্রি (তারিখ, টোকেন নং, পরিমাণ)।
     * পোস্টপেইড মাসিক মিটার বিল।
   - 🔥 **গ্যাস বিল:**
     * এলপি গ্যাস সিলিন্ডার: সিলিন্ডার নাম, ক্রয় তারিখ, খরচ, সম্ভাব্য দিন, স্বয়ংক্রিয় প্রগ্রেস বার ও রানিং স্ট্যাটাস।
     * লাইন গ্যাস বিল: ফিক্সড বিল।
     * প্রিপেইড গ্যাস মিটার রিচার্জ।
   - 📶 **ওয়াইফাই / ইন্টারনেট বিল:** প্রোভাইডার, মাসিক ফি।
   - 🗑️ **ময়লা বিল:** মাসিক রেট।
   - 💧 **পানি বিল:** মাসিক বিল।
   - 🧹 **কাজের বুয়া / খালার মাসিক বেতন:** ফিক্সড মাসিক বেতন (কোনো অযথা দৈনিক হাজিরা নয়!)।
   - 📦 **অন্যান্য খরচ:** ফিল্টার পানি, পেপার বিল, সাধারণ মেস সামগ্রী।
2. **"নতুন বিল যোগ করুন" স্মার্ট মডাল:**
   - ক্যাটাগরি সিলেক্ট করলে প্রাসঙ্গিক ফিল্ড স্বয়ংক্রিয়ভাবে ওপেন হবে (যেমন: সিলিন্ডার সিলেক্ট করলে 'সম্ভাব্য দিন' আসবে, প্রিপেইড সিলেক্ট করলে 'টোকেন নং' আসবে)।

---

### Task 7: Frontend UI — Cost Distribution & Master Sheet Sync Preview
**Objective:** Build Tab 3 displaying the final calculated distribution per member (Individual Rent + Utility Share = Total Payable) matching Master Sheet formulas.

**Files:**
- Modify: `frontend/src/app/dashboard/rent-utilities/page.tsx` (Tab 3)
- Modify: `frontend/src/app/dashboard/master-sheet/page.tsx` (Ensure tab 3 links directly to `/dashboard/rent-utilities` for editing)

---

### Task 8: End-to-End Build, Verification & Production Deployment
**Objective:** Verify full stack integration, test build with 0 TypeScript/ESLint errors, and sync git.

**Verification Commands:**
```bash
# 1. Backend tests & API health
docker exec -it mess_backend pytest -q
curl -s http://localhost:8086/api/v1/health | grep "মেস ম্যানেজার বিডি API সচল আছে"

# 2. Frontend production build
cd /home/imon/mess-saas/frontend && npm run build

# 3. Git commit & push
cd /home/imon/mess-saas && git status && git push origin main
```

---

## ৪. নিরাপত্তা ও ট্রানজিশন গ্যারান্টি (Safety & Compatibility)
1. **বিদ্যমান ডেটা সুরক্ষা:** পূর্ববর্তী `fixed_costs` এবং গ্যাস সিলিন্ডার রেকর্ড অক্ষত থাকবে।
2. **রোল পারমিশন গার্ড:** মেম্বাররা শুধুমাত্র ভিউ করতে পারবেন, মেস ম্যানেজার/ওনার ছাড়া কেউ বাড়িভাড়া বা বিল এডিট করতে পারবে না।
3. **পুরনো লিংকের রিডাইরেকশন:** `/dashboard/maid-gas` ভিজিট করলে স্বয়ংক্রিয়ভাবে `/dashboard/rent-utilities`-এ রিডাইরেক্ট হবে।
