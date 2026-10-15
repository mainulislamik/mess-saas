# MessManager BD — Next-Generation Upgrades Implementation Plan

> **For Hermes:** Use `subagent-driven-development` or sequential task execution to implement this plan module-by-module.

**Goal:** Transform MessManager BD from a standard bachelor mess ledger into Bangladesh's most comprehensive, automated, and intelligent Bachelor Mess & Hostel SaaS platform.

**Architecture:**
- **Frontend:** Next.js 15 App Router, Tailwind CSS, Lucide icons, `@react-pdf/renderer` or browser print styles for A4 audit documents, React Hook Form, and Canvas/Audio/Voice helpers.
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2 Async, Pydantic v2 schemas, BackgroundTasks for automated digests, regex/fuzzy NLP item parsers for rapid bazar entry.
- **Storage & Caching:** PostgreSQL 16 (relational schema expansions with Alembic), Redis 7 (polling sessions, rate limiting, and temporary queues).

---

## 🌟 Executive Overview of Next-Gen Modules

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               MESSMANAGER BD — NEXT-GEN UPGRADE MATRIX                          │
├───────────────────────────────┬───────────────────────────────┬─────────────────────────────────┤
│ Module 1: Official Reporting  │ Module 2: Smart Bazar Quick   │ Module 3: Food Menu & Polling   │
│ • Printable A4 Master Audit   │ • Quick Text / NLP Bazar Parse│ • "কী রান্না হবে?" Weekend Poll │
│ • Notice Board Fridge Printout│ • Live Bazar Price Inflation  │ • Auto-Generated Bazar List     │
│ • 1-Click Excel / CSV Export  │ • Repeat Item Memory & Budget │ • Special Feast / Feast Sharing │
├───────────────────────────────┼───────────────────────────────┼─────────────────────────────────┤
│ Module 4: Maid & Utility Hub  │ Module 5: WhatsApp & SMS Bot  │ Module 6: Mobile PWA App        │
│ • খালা/বুয়া Attendance & Pay │ • Daily 10 PM Mess Summary    │ • Installable PWA Icon on Home  │
│ • Gas Cylinder Expiry Forecast│ • 1-Click Balance Dues Alert  │ • Offline Today's Meal Cache    │
│ • WiFi & Garbage Due Tracker  │ • Auto Cut-Off Locking Alert  │ • Biometric / 1-Tap Quick PIN   │
└───────────────────────────────┴───────────────────────────────┴─────────────────────────────────┘
```

---

## 📋 Module 1: Official Monthly Audit PDF & Notice Board Print Engine

### Objective
Bachelor messes in Bangladesh require a physical paper sheet pinned to the refrigerator or notice board at the end of the month, signed by the Mess Manager and Auditor. This module provides a 1-click pixel-perfect A4 Landscape printable audit document with Bangla typography, official tables, and signatures.

### Files to Create / Modify
- Create: `frontend/src/app/dashboard/master-sheet/print/page.tsx` (Dedicated printable route with `@media print` CSS)
- Create: `frontend/src/components/PrintableMasterSheet.tsx` (Official format with Header, Mess Code, 31-day Meal Grid, Bazar Ledger, Utility Split, Individual Dues/Refunds, Signatures)
- Modify: `frontend/src/app/dashboard/master-sheet/page.tsx` (Add "প্রিন্ট ও পিডিএফ ডাউনলোড" button)
- Modify: `backend/app/api/v1/master_sheet.py` (Add `/export-csv` endpoint for Excel lovers)

### Step-by-Step Tasks

#### Task 1.1: Backend CSV Export Endpoint
- **Endpoint:** `GET /api/v1/messes/{mess_id}/master-sheet/export-csv?month=YYYY-MM`
- **Output:** `StreamingResponse(content=..., media_type="text/csv", headers={"Content-Disposition": "attachment; filename=mess_master_sheet_2026_10.csv"})`
- Generates 3 CSV tables combined or zipped:
  1. Member summary (Total Meals, Meal Cost, Fixed Cost, Deposits, Final Balance).
  2. Daily meal grid (1-31 days).
  3. Bazar expenses with date, shopper, and items.

#### Task 1.2: Frontend Dedicated Print-Optimized Layout
- Clean black-and-white high-contrast layout formatted strictly for standard **A4 Landscape** (`297mm x 210mm`).
- Hides sidebar, header, and buttons using CSS `@media print`.
- Auto-triggers `window.print()` upon route navigation.

---

## 🛒 Module 2: Natural Language Quick Bazar & Price Spikes Radar

### Objective
Managers and members hate manually typing individual bazar rows. Instead of 5 dropdowns and inputs, this feature allows typing a natural Bangla/English sentence (e.g. `আলু ৬০, ডিম ১৩০, পেঁয়াজ ১০০, তেল ২২০, ব্রয়লার ৩৫০`) and instantly parsing items, prices, calculating the total (৳৮৬০), and submitting with 1 click.

### Files to Create / Modify
- Create: `backend/app/services/bazar_parser.py` (Regex and NLP tokenizer extracting item names and numeric prices)
- Create: `backend/app/api/v1/bazar_quick_entry.py` (API accepting raw string and returning structured items)
- Modify: `frontend/src/app/dashboard/bazar/page.tsx` (Add "স্মার্ট কুইক এন্ট্রি" tab with live syntax highlighter)
- Create: `frontend/src/components/BazarTrendRadar.tsx` (Shows average price trends: e.g. "গত সপ্তাহের চেয়ে ডিমের ডজন ৳১০ বেড়েছে")

### Code Design (`bazar_parser.py`):
```python
import re
from typing import List, Dict, Any

def parse_bazar_text(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses strings like:
    'আলু ৬০, ডিম ১৩০, পেয়াজ ১০০, তেল ২২০, মুরগি ৩৫০'
    or
    'alu 60, dim 130, piyaj 100'
    Returns: [{'item': 'আলু', 'cost': 60.0}, ...]
    """
    items = []
    # Split by comma, newline, or plus
    tokens = re.split(r'[,+\n;/]+', raw_text)
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        # Match item name followed by price or price followed by item
        match = re.search(r'([^\d৳\s]+(?:\s+[^\d৳\s]+)*)\s*[=:-]?\s*(\d+(?:\.\d+)?)', token)
        if match:
            item_name = match.group(1).strip()
            amount = float(match.group(2))
            items.append({"item_name": item_name, "amount": amount})
        else:
            # Check reverse: 120 taka dim
            reverse_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:টাকা|tk|/-)?\s*([^\d\s]+.*)', token)
            if reverse_match:
                amount = float(reverse_match.group(1))
                item_name = reverse_match.group(2).strip()
                items.append({"item_name": item_name, "amount": amount})
    return items
```

---

## 🍲 Module 3: Daily Food Menu & Weekend Meal Voting System

### Objective
The #1 daily friction in bachelor messes is deciding what to cook, especially for Friday lunch (জুম্মার দিনের স্পেশাল খাবার). This module introduces a democratic polling engine where members vote on candidate menus.

### Database Model:
```python
class MenuPoll(Base):
    __tablename__ = "menu_polls"
    id = Column(UUID, primary_key=True, default=uuid4)
    mess_id = Column(UUID, ForeignKey("messes.id"), nullable=False)
    date = Column(Date, nullable=False) # e.g. Friday 2026-10-16
    meal_type = Column(String(20), default="lunch") # lunch / dinner
    title = Column(String(100)) # e.g. "শুক্রবার স্পেশাল মেন্যু ভোটিং"
    options = Column(JSONB) # [{"id": 1, "name": "বিফ তেহারি ও সালাদ", "votes": 5}, {"id": 2, "name": "চিকেন বিরিয়ানি", "votes": 3}]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Features:
1. **Weekly Routine Template:** Manager sets Sunday-Thursday standard routine (e.g., Saturday: ডাল-ভাত-মাছ, Sunday: ডিম-খিচুড়ি).
2. **Weekend Feast Polling:** Manager launches a poll with 2-3 options. Members vote directly from their dashboard.
3. **Auto Bazar Suggestion:** When an option wins (e.g., "চিকেন বিরিয়ানি"), system auto-populates a suggested bazar list based on total members eating that day (পোলাও চাল ৩ কেজি, মুরগি ৪ কেজি, তেল ৫০০ গ্রাম, ইত্যাদি).

---

## 🧹 Module 4: Maid / Cook (খালা) Management & Utility Forecast Engine

### Objective
Bachelor messes in Dhaka and major cities rely on part-time or full-time cooks (খালা/বুয়া). Tracking attendance, holidays, monthly salary, and gas cylinder life prevents end-of-month disputes.

### Features & Database Architecture:
1. **Cook Profile & Attendance:**
   - Name, phone, emergency contact, monthly salary (৳৩,৫০০), joining date.
   - Daily attendance (উপস্থিত, ছুটি, অনুপস্থিত).
   - If cook is absent, system displays: "আজ খালা আসেননি — বাইরের খাবার বা নিজেরা রান্নার ব্যবস্থা নিন"।
2. **Gas Cylinder Usage Tracker & Depletion Forecast:**
   - Date when a new LP Gas cylinder was bought (e.g., 12kg @ ৳১,৩৮০).
   - Real-time forecast based on daily meal count: "গ্যাস সিলিন্ডার আগামী ৫ দিনের মধ্যে শেষ হতে পারে — অগ্রিম অর্ডার করুন"।
3. **Utility Bill Checklist:**
   - Monthly reminders for WiFi bill (by 5th), Flat Rent (by 7th), Waste management/ময়লার বিল (by 10th).

---

## 💬 Module 5: Automated WhatsApp & SMS Notification Gateway

### Objective
Eliminate manual copy-pasting of reminders by providing an automated notification engine via WhatsApp Baileys Gateway or SMS.

### Trigger Matrix:
1. **Daily 10:00 PM Mess Recap:**
   - Automated message to the Mess WhatsApp Group:
     > 📢 **মেস ম্যানেজার বিডি — আজকের সারাংশ (১৪ অক্টোবর)**
     > 🍲 মোট মিল: ১৮টি
     > 🛒 আজকের বাজার: ৳৬৮০ (করিম)
     > ⏰ **সতর্কতা:** কালকের মিল পরিবর্তন করার শেষ সময় আজ রাত ১০:৩০ মিনিট।
2. **Instant Negative Balance Alert:**
   - If a member's net balance falls below -৳১,০০০:
     > ⚠️ **তামিম ইকবাল**, আপনার মেসে বকেয়া জমা ৳১,২৫০। নিরবচ্ছিন্ন মিল নিশ্চিত করতে অনুগ্রহ করে দ্রুত মেস ফান্ডে জমা দিন।
3. **Closing Day Statement Delivery:**
   - On the 1st of every month, every member automatically receives their complete personal voucher on WhatsApp with bKash/Nagad payment number.

---

## 📱 Module 6: Installable Progressive Web App (PWA) & Offline Mode

### Objective
Allow members to install the software directly to their Android/iOS phone home screens like a native app without going through the Google Play Store.

### Key Components:
1. `public/manifest.json` with app icons (192x192, 512x512), theme color `#059669` (Emerald), background color `#f8fafc`.
2. `public/sw.js` (Service Worker) caching dashboard shells, CSS, icons, and API responses for today's meal status.
3. "হোম স্ক্রিনে অ্যাপ ইনস্টল করুন" prompt button for mobile users.

---

## 🗓️ Phased Implementation Schedule

| Phase | Module | Estimated Scope | Priority |
|---|---|---|---|
| **Phase 1** | **Printable A4 Master Audit PDF & Notice Board Engine** | 2 Days | 🔥 Critical |
| **Phase 2** | **Natural Language Quick Bazar Entry & Item Autocomplete** | 2 Days | ⚡ High |
| **Phase 3** | **Weekly Meal Routine & Weekend Feast Voting** | 3 Days | ⚡ High |
| **Phase 4** | **Maid / Cook Management & Gas Cylinder Forecast** | 2 Days | 💡 Medium |
| **Phase 5** | **WhatsApp & SMS Bot Notification Automation** | 3 Days | 💡 Medium |
| **Phase 6** | **Mobile PWA & Offline Cache Engine** | 1 Day | ✨ Polish |

---

## 🎯 Verification & Acceptance Criteria
- [ ] Master sheet print page renders cleanly in standard browser print dialog without overlapping columns.
- [ ] Quick Bazar parser correctly extracts item names and amounts from both Bengali and English text.
- [ ] Members can cast votes on meal menu polls without seeing other members' private information.
- [ ] Cook attendance status integrates with the daily dashboard view.
- [ ] All new routes comply with strict role separation (Super Admin, Manager, Member).
