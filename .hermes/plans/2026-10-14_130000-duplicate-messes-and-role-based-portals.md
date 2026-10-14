# Duplicate Messes Resolution & Role-Based Dual-Portal Architecture Implementation Plan

> **For Hermes:** Use this comprehensive plan to resolve duplicate mess anomalies and implement strict Role-Based Access Control (RBAC) separating Manager and Member portals with a seamless dual-portal switcher.

**Goal:** 
1. Database cleanup and permanent resolution of duplicate mess entries across backend queries, seed scripts, and Super Admin UI.
2. Architecture and implementation of distinct **মেস ম্যানেজার পোর্টাল (Manager Management Suite)** and **মেস সদস্য পোর্টাল (Member Personal Suite)** with role guards and a dual-view switcher for managers.

**Architecture:**
- **Backend:** Enforce uniqueness constraints, idempotency in mess creation, add `/api/v1/messes/{id}` delete/purge endpoint for superadmin, and provide member-specific endpoints (`/dashboard/my-summary`, `/meals/my-status`, `/deposits/request`).
- **Frontend:** Implement dual navigation states in `DashboardNav`, create dedicated `<MemberPortal>` and `<ManagerPortal>` components under `/dashboard`, restrict admin-only routes (`/dashboard/closing`, `/dashboard/messes/settings`) to `OWNER` / `MANAGER`, and provide a sleek topbar toggle for managers to switch between "মেস ম্যানেজমেন্ট" and "আমার ব্যক্তিগত হিসাব".
- **Design Language:** Light mode, high contrast (#0f172a / #475569), Tailwind CSS, Lucide icons, Bengali UI terminology.

---

## Part 1: Root Cause Analysis

### 1. Issue 1: Multiple Duplicate Messes ("ধানমন্ডি শান্তি নিবাস" appearing 4 times)
- **Root Cause A (Seed Script Non-Idempotency):** The developer seed script (`scripts/seed_demo_mess.py`) made raw `POST /messes` requests on every invocation without verifying whether "ধানমন্ডি শান্তি নিবাস" already existed. Each invocation generated a new 6-character invite code (`JFNYYY`, `M2RVVL`, `L2Y6GL`, `UZ76NZ`).
- **Root Cause B (Missing Name/Owner Deduplication in Backend):** `POST /api/v1/messes` in `backend/app/api/v1/messes.py` allowed an owner to create unlimited messes with identical names without warning or slug conflict detection.
- **Root Cause C (Missing Super Admin Purge/Delete Action):** In `/platform/messes`, the super admin had no UI button to delete redundant or orphaned demo messes.

### 2. Issue 2: Manager and Member Portals are Identical
- **Root Cause A (Universal Navigation):** `DashboardNav.tsx` currently renders the same 5 links (`ড্যাশবোর্ড`, `মিল কাউন্ট`, `বাজার খরচ`, `মাস সমাপনী (Closing)`, `মেস সেটিংস`) regardless of whether the user is `MemberRole.MEMBER` or `MemberRole.MANAGER`.
- **Root Cause B (No Personalized Member View):** A regular member logging in wants to know: *"How many meals did I have this month? How much have I paid? What is my share of the rent and bua? Do I owe money or does the mess owe me?"* Currently, they are dumped into the administrative dashboard with mess-wide graphs and forms to add expenses and close months.
- **Root Cause C (No Dual Mode for Managers):** In Bangladesh bachelor messes, the manager is also a paying roommate. The manager needs to switch between administrating the whole mess and seeing their own individual dues.

---

## Part 2: Implementation Tasks

### Phase 1: Database Cleanup & Duplicate Mess Prevention

#### Task 1.1: Database Deduplication Script
- **Objective:** Retain the single canonical mess with complete operational data (`JFNYYY` with 5 members, 140+ meals, full bazars, deposits, and closings) and cleanly purge redundant duplicates (`M2RVVL`, `L2Y6GL`, `UZ76NZ`, and orphaned test records).
- **Files:**
  - Create: `scripts/cleanup_duplicate_messes.py`
- **Verification:** Run script via `docker exec mess_backend python3 scripts/cleanup_duplicate_messes.py` and verify `SELECT count(*) FROM messes` returns exactly 3 clean distinct messes (Dhanmondi Shanti Nibash, Mirpur Green Mess, Mirpur Bachelor Mess).

#### Task 1.2: Idempotent Seed Script
- **Objective:** Update `scripts/seed_demo_mess.py` so that it checks if the mess name or owner already exists before inserting. If it exists, update or re-use existing IDs rather than creating duplicates.
- **Files:**
  - Modify: `scripts/seed_demo_mess.py`

#### Task 1.3: Super Admin Mess Delete & Purge API & UI
- **Objective:** Enable Super Admin to delete or purge any mess directly from `/platform/messes` with confirmation modal.
- **Files:**
  - Modify: `backend/app/api/v1/platform.py` (add `DELETE /platform/messes/{id}`)
  - Modify: `frontend/src/app/platform/messes/page.tsx` (add delete trash icon button with confirmation dialog)

---

### Phase 2: Role-Based Access Control (RBAC) & Member-Specific Endpoints

#### Task 2.1: Member Personal Ledger Endpoint (`GET /dashboard/my-summary`)
- **Objective:** Provide a fast, personalized financial ledger endpoint for the currently logged-in member for the active mess and month.
- **Output Data:**
  - `my_total_meals`: Number of breakfast, lunch, dinner, guest meals for current user.
  - `current_meal_rate`: Current dynamic meal rate (৳).
  - `my_meal_cost`: `my_total_meals * current_meal_rate`.
  - `my_fixed_cost_share`: User's proportion of rent, bua, wifi, gas.
  - `my_total_deposits`: Total verified money deposited by user this month.
  - `net_balance`: `my_total_deposits - (my_meal_cost + my_fixed_cost_share)` (Positive = 🟢 Advance/Surplus, Negative = 🔴 Due/Payable).
  - `recent_deposits`: List of deposits made by user with status (`verified`, `pending`).
  - `today_meal_status`: Today's breakfast, lunch, dinner count and toggle permission.
- **Files:**
  - Modify: `backend/app/api/v1/dashboard.py` (add `@router.get("/my-summary")`)
  - Create schema in `backend/app/schemas/dashboard.py` (`MemberPersonalSummary`)

#### Task 2.2: Member Meal Toggle Request Endpoint
- **Objective:** Allow members to toggle their own upcoming meals (e.g. stop dinner) before a mess cutoff time (default 4:00 PM).
- **Files:**
  - Modify: `backend/app/api/v1/meals.py` (add `@router.post("/my-toggle")`)

#### Task 2.3: Member Deposit Submission (bKash/Nagad TrxID)
- **Objective:** Allow regular members to submit a deposit slip with method, amount, TrxID, and date for manager approval.
- **Files:**
  - Modify: `backend/app/api/v1/deposits.py` (ensure members can create deposit requests with status `pending`, managers can approve/reject).

---

### Phase 3: Frontend Dual-Portal Architecture & UI Separation

#### Task 3.1: Auth Context Enhancement with Current Role & View Mode
- **Objective:** Add `currentRole` ('owner' | 'manager' | 'member'), `activePortalMode` ('manager' | 'member'), and `togglePortalMode()` to `AuthContext`.
- **Files:**
  - Modify: `frontend/src/lib/auth-context.tsx`

#### Task 3.2: Role-Aware Navigation (`DashboardNav.tsx`)
- **Objective:** Dynamically render navigation items based on `currentRole` and `activePortalMode`:
  - **Manager Mode Navigation:**
    1. 📊 ড্যাশবোর্ড (`/dashboard`)
    2. 🍱 মিল কাউন্ট শিট (`/dashboard/meals`)
    3. 🛒 বাজার খরচ ও অনুমোদন (`/dashboard/bazar`)
    4. 📑 মাস সমাপনী (Closing) (`/dashboard/closing`)
    5. ⚙️ মেস সেটিংস ও মেম্বারস (`/dashboard/messes`)
  - **Member Mode Navigation:**
    1. 👤 আমার খতিয়ান ও হিসাব (`/dashboard`)
    2. 🍽️ আমার আজকের মিল (`/dashboard/my-meals`)
    3. 💳 টাকা জমা দিন (Deposit) (`/dashboard/my-deposits`)
    4. 🛍️ বাজার রসিদ ও রোস্টার (`/dashboard/bazar-roster`)
  - **Dual Mode Toggle for Managers:**
    - A sleek pill button in the topbar:
      `[🛡️ মেস ব্যবস্থাপনা | 👤 আমার ব্যক্তিগত হিসাব]`
- **Files:**
  - Modify: `frontend/src/components/DashboardNav.tsx`

#### Task 3.3: Personalized Member Dashboard (`MemberDashboardView.tsx`)
- **Objective:** Design and build an intuitive, high-contrast member dashboard component:
  1. **Personal Financial Status Card:**
     - Big bold balance indicator:
       - 🟢 **মেসের কাছে আপনার জমা আছে: ৳১,৪৫০** (সবুজ কার্ড) অথবা
       - 🔴 **মেসে আপনার বকেয়া: ৳৮২০** (গোলাপী কার্ড)
     - Quick breakdown: মোট জমা (৳৬,০০০) - মিল খরচ (৳৩,১২০) - ফিক্সড খরচ (৳১,৪৩০)
  2. **Today's Meal Widget:**
     - Toggle: সকাল [খেয়েছি], দুপুর [বন্ধ], রাত [চালু]
     - Cutoff notice: *"বিকাল ৪টার পর রাতের মিল পরিবর্তন করা যাবে না"*
  3. **Deposit History & New Deposit Button:**
     - Recent transactions with verification checkmark.
     - 1-click modal to submit bKash/Nagad TrxID.
  4. **Mess Vital Stats (Read-Only):**
     - Current estimated meal rate (৳৭৭.৯৭/মিল).
     - Total mess meals and total bazar (for complete transparency without administrative clutter).
- **Files:**
  - Create: `frontend/src/components/dashboard/MemberDashboardView.tsx`
  - Modify: `frontend/src/app/dashboard/page.tsx` (conditionally render `MemberDashboardView` or `ManagerDashboardView`)

#### Task 3.4: Route Protection for Administrative Pages
- **Objective:** Ensure members who try to navigate directly to `/dashboard/closing` or `/dashboard/messes` get an informative restriction screen or redirection to their personal dashboard.
- **Files:**
  - Modify: `frontend/src/app/dashboard/closing/page.tsx`
  - Modify: `frontend/src/app/dashboard/messes/page.tsx`

---

## Part 3: Verification & Quality Assurance

1. **Database Sanity Check:**
   - Execute query to ensure exactly 1 canonical "ধানমন্ডি শান্তি নিবাস" with code `JFNYYY` exists.
   - Super Admin table at `/platform/messes` must show exactly 1 entry for Dhanmondi with 5 members, plus legitimate other messes.
2. **Manager Login Test (`01711002233`):**
   - Verify manager sees Manager Portal with full controls.
   - Verify manager can toggle to "আমার ব্যক্তিগত হিসাব" to view their own personal dues.
3. **Member Login Test (`01711002234` - Tamim Iqbal):**
   - Verify member logs in directly to Member Portal.
   - Verify member CANNOT see "মাস সমাপনী (Closing)" in nav.
   - Verify member sees their personal balance (৳৬,০০০ জমা, ৪২ মিল, বকেয়া/পাওনা).
4. **Git Commit & Push:**
   - Run `npm run build` to verify 0 TypeScript/Next.js errors.
   - Commit and push to `mainulislamik/mess-saas`.
