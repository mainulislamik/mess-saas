# মেস ম্যানেজার বিডি (MessManager BD) 🇧🇩
### বাংলাদেশের ব্যাচেলর মেস ও হোস্টেল ম্যানেজমেন্ট ক্লাউড SaaS প্ল্যাটফর্ম

> **"খাতা-কলমের হিসাবের দিন শেষ, মেস চলবে অটোমেশনে নির্ভুলভাবে!"**

মেস ম্যানেজার বিডি হলো বাংলাদেশের বিশ্ববিদ্যালয় ও চাকরিজীবী ব্যাচেলর মেসের জন্য বিশেষভাবে তৈরি একটি মাল্টি-টেন্যান্ট, পূর্ণাঙ্গ অটোমেটেড SaaS ওয়েব অ্যাপ্লিকেশন। খাতা-কলমে মিল লেখা, বাজার খরচের রশিদ হারানো, গ্যাস/ওয়াইফাই/ভাড়ার জটিল ভাগাভাগি এবং মাস শেষে মিল রেট হিসাবের ক্যাচাল চিরতরে বন্ধ করতে এটি তৈরি করা হয়েছে।

---

## 🎯 মূল ফিচারসমূহ (Core Features)

1. **🔐 বাংলাদেশি মোবাইল অথেন্টিকেশন**:
   - `+880` বাংলাদেশি ফোন নম্বর ও পাসওয়ার্ড লগইন
   - দ্রুত ও নিরাপদ JWT অথেন্টিকেশন

2. **🏢 মাল্টি-টেন্যান্ট মেস ও রুম সিস্টেম**:
   - মেস ক্রিয়েশন (জেলা, থানা, এলাকা)
   - ৬ ডিজিটের ইউনিক ইনভাইট কোড (যেমন: `JFNYYY`)
   - মেম্বারদের রোল সিস্টেম: ওনার (Owner), ম্যানেজার (Manager), সদস্য (Member)
   - রুম ও সিট ট্র্যাকিং (রুম নম্বর, সিট লেবেল)

3. **🍽️ মিল ইঞ্জিন (Meal Engine)**:
   - দৈনিক ব্রেকফাস্ট (০ / ০.৫ মিল), লাঞ্চ (১.০ মিল) ও ডিনার (১.০ মিল) ট্র্যাকিং
   - বাড়িতে গেলে এক ক্লিকে "মিল অফ (OFF)" করার সুবিধা
   - ম্যানেজারের জন্য একক বা ব্যাচ মিল আপডেট

4. **🛒 বাজার খরচ ট্র্যাকিং (Bazar Management)**:
   - তারিখ, বাজারকারী মেম্বার নির্বাচন, বাজার খরচের পরিমাণ (৳ BDT)
   - বাজারের ফর্দ / আইটেম বিবরণী ও রসিদ সংরক্ষণ

5. **💳 মেম্বার ডিপোজিট ও কালেকশন (Deposits)**:
   - ক্যাশ (Cash), বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket) ও ব্যাংক ট্রান্সফার
   - ডিজিটাল ট্রানজেকশন আইডি (TrxID) ট্র্যাকিং ও ভেরিফিকেশন

6. **⚡ ফিক্সড ইউটিলিটি বিল (Fixed Costs Split)**:
   - বাসা ভাড়া (Rent), গ্যাস বিল (সিলিন্ডার ৳১০৮০), ওয়াইফাই বিল (৳৮০০), খালা/বুয়া বিল (৳৩৫০০)
   - মেসের সব সক্রিয় সদস্যদের মাঝে সমান ভাগাভাগি

7. **📊 লাইভ ক্যালকুলেশন ও মাস সমাপনী (Monthly Closing Engine)**:
   - **মিল রেট ফর্মুলা:**
     $$\text{Meal Rate} = \frac{\text{Total Bazar Expense}}{\text{Total Consumed Meals}}$$
   - **সদস্যের পাওনা / দেনা হিসাব:**
     $$\text{Member Total Cost} = (\text{Member Meals} \times \text{Meal Rate}) + \frac{\text{Total Fixed Cost}}{\text{Active Members}}$$
     $$\text{Net Balance} = \text{Member Total Deposit} - \text{Member Total Cost}$$
     - ব্যালেন্স পজিটিভ হলে **ফেরত (Refund/Advance)**
     - ব্যালেন্স নেগেটিভ হলে **বাকি (Due)**

---

## 🛠️ প্রযুক্তি স্ট্যাক (Tech Stack)

- **Frontend**: Next.js 15 (App Router, Turbopack, React 19, TypeScript, Tailwind CSS, Lucide Icons)
- **Backend**: FastAPI (Python 3.12, Pydantic v2, AsyncPG, SQLAlchemy 2.0, Uvicorn)
- **Database**: PostgreSQL 16 (Row-level Multi-tenancy with `mess_id`)
- **Cache**: Redis 7
- **Database Migrations**: Alembic
- **Containerization**: Docker Compose

---

## 🚀 পোর্ট কনফিগারেশন (Port Bindings)

| Service | Container Port | Host Port | Description |
|---|---|---|---|
| **Frontend** | `3000` | `3085` | `http://localhost:3085` |
| **Backend API** | `8000` | `8086` | `http://localhost:8086` (Swagger Docs: `/docs`) |
| **PostgreSQL** | `5432` | `5436` | Database Host Connection |
| **Redis** | `6379` | `6385` | Redis Cache Host Connection |

---

## 🏃♂️ লোকাল সেটআপ ও রান করার নিয়ম

### ১. রিপোজিটরি ক্লোন করুন
```bash
git clone https://github.com/mainulislamik/mess-saas.git
cd mess-saas
```

### ২. এনভায়রনমেন্ট কনফিগারেশন
```bash
cp .env.example .env
```

### ৩. ডকার কনটেইনার চালু করুন
```bash
docker compose up -d --build
```

### ৪. ডাটাবেজ মাইগ্রেশন প্রয়োগ করুন
```bash
docker exec mess_backend alembic upgrade head
```

### ৫. ডেমো ডাটা সিড করুন (বাংলাদেশি বাস্তব প্রেক্ষাপট)
```bash
python3 scripts/seed_demo_mess.py
```

---

## 👥 ডেমো লগইন ক্রেডেনশিয়ালস (Demo Accounts)

সিড স্ক্রিপ্ট রান করার পর নিচের যেকোনো অ্যাকাউন্ট দিয়ে লগইন করতে পারবেন (`http://localhost:3085/login`):

| নাম | পদবী | ফোন নম্বর | পাসওয়ার্ড |
|---|---|---|---|
| **মোঃ ইমোন** | মেস ম্যানেজার / ওনার | `01711002233` | `password123` |
| **তামিম ইকবাল** | সাধারণ সদস্য | `01711002234` | `password123` |
| **মুশফিকুর রহিম** | সাধারণ সদস্য | `01711002235` | `password123` |
| **সাকিব আল হাসান** | সাধারণ সদস্য | `01711002236` | `password123` |
| **তাসকিন আহমেদ** | সাধারণ সদস্য | `01711002237` | `password123` |

**ডেমো মেস ইনভাইট কোড**: `JFNYYY` (ধানমন্ডি শান্তি নিবাস)

---

## 📝 লাইসেন্স
MIT License — Copyright (c) 2026 Imon Khan / Shopping Zone BD.
