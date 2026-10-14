#!/usr/bin/env python3
"""
Seed script for Bachelor Mess Management SaaS (Bangladesh Context)
Creates realistic demo data for testing and demonstration.
"""
import urllib.request
import urllib.error
import json
from datetime import date, timedelta

BASE_URL = "http://localhost:8086/api/v1"

def post(url, data, token=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def patch(url, data, token=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def main():
    print("=== SEEDING BANGLADESH BACHELOR MESS DEMO DATA ===")

    # 1. Register 5 Members
    members = [
        {"name": "মোঃ ইমোন", "phone": "01711002233", "pass": "password123", "role": "owner", "seat": "রুম ১ (মাস্টার বেড)"},
        {"name": "তামিম ইকবাল", "phone": "01711002234", "pass": "password123", "role": "manager", "seat": "রুম ১ (সিট ২)"},
        {"name": "মুশফিকুর রহিম", "phone": "01711002235", "pass": "password123", "role": "member", "seat": "রুম ২ (সিট ১)"},
        {"name": "সাকিব আল হাসান", "phone": "01711002236", "pass": "password123", "role": "member", "seat": "রুম ২ (সিট ২)"},
        {"name": "তাসকিন আহমেদ", "phone": "01711002237", "pass": "password123", "role": "member", "seat": "রুম ৩ (ড্রয়িং সিট)"},
    ]

    tokens = {}
    user_ids = {}

    for m in members:
        try:
            reg = post(f"{BASE_URL}/auth/register", {"name": m["name"], "phone": m["phone"], "password": m["pass"]})
            tokens[m["phone"]] = reg["access_token"]
            user_ids[m["phone"]] = reg["user"]["id"]
            print(f"✓ Registered: {m['name']} ({m['phone']})")
        except urllib.error.HTTPError as e:
            # Maybe already registered, try login
            login = post(f"{BASE_URL}/auth/login", {"phone": m["phone"], "password": m["pass"]})
            tokens[m["phone"]] = login["access_token"]
            # get user id via /auth/me
            req = urllib.request.Request(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"})
            with urllib.request.urlopen(req) as resp:
                u = json.loads(resp.read().decode())
                user_ids[m["phone"]] = u["id"]
            print(f"✓ Logged in: {m['name']} ({m['phone']})")

    owner_token = tokens[members[0]["phone"]]
    owner_id = user_ids[members[0]["phone"]]

    # 2. Create Mess: "ধানমন্ডি শান্তি নিবাস"
    mess_name = "ধানমন্ডি শান্তি নিবাস"
    mess = post(
        f"{BASE_URL}/messes",
        {
            "name": mess_name,
            "district": "Dhaka",
            "thana": "Dhanmondi",
            "area": "Road 4/A, House 22",
        },
        token=owner_token,
    )
    mess_id = mess["id"]
    invite_code = mess["invite_code"]
    print(f"✓ Created Mess: {mess_name} (Code: {invite_code})")

    # 3. Other 4 members join using invite code
    for m in members[1:]:
        t = tokens[m["phone"]]
        joined = post(f"{BASE_URL}/messes/join", {"code": invite_code}, token=t)
        print(f"✓ {m['name']} joined mess with code {invite_code}")

        # Update seat label & role if needed
        if m["role"] != "member":
            patch(
                f"{BASE_URL}/messes/{mess_id}/members/{user_ids[m['phone']]}",
                {"role": m["role"], "seat_label": m["seat"]},
                token=owner_token,
            )
        else:
            patch(
                f"{BASE_URL}/messes/{mess_id}/members/{user_ids[m['phone']]}",
                {"role": "member", "seat_label": m["seat"]},
                token=owner_token,
            )

    # 4. Add Fixed Costs for current month
    current_month = date.today().strftime("%Y-%m")
    fixed_costs = [
        {"title": "বাসা ভাড়া (অক্টোবর)", "category": "rent", "amount": 25000.0},
        {"title": "গ্যাস বিল (সিলিন্ডার)", "category": "gas", "amount": 1080.0},
        {"title": "ওয়াইফাই ইন্টারনেট (অপটিক্যাল ফাইবার)", "category": "wifi", "amount": 800.0},
        {"title": "খালা / রান্নার বিল", "category": "cook_maid", "amount": 3500.0},
    ]
    for fc in fixed_costs:
        post(
            f"{BASE_URL}/messes/{mess_id}/fixed-costs",
            {"month": current_month, "title": fc["title"], "category": fc["category"], "amount": fc["amount"]},
            token=owner_token,
        )
    print(f"✓ Added 4 fixed bills (Total: ৳30,380)")

    # 5. Add Bazar Entries
    bazars = [
        {"shopper": members[0]["phone"], "date": date.today().strftime("%Y-%m-02"), "amount": 3200.0, "items": "মিনিকেট চাল ২৫ কেজি বস্তা, সয়াবিন তেল ৫ লিটার"},
        {"shopper": members[1]["phone"], "date": date.today().strftime("%Y-%m-05"), "amount": 2150.0, "items": "ব্রয়লার মুরগি ৪ কেজি, আলু, পেঁয়াজ, রসুন, আদা"},
        {"shopper": members[2]["phone"], "date": date.today().strftime("%Y-%m-08"), "amount": 2800.0, "items": "রুই মাছ ২.৫ কেজি, সবজি, টমেটো, ধনেপাতা"},
        {"shopper": members[3]["phone"], "date": date.today().strftime("%Y-%m-11"), "amount": 1950.0, "items": "গরুর মাংস ২ কেজি, গরম মসলা, তেজপাতা"},
        {"shopper": members[4]["phone"], "date": date.today().strftime("%Y-%m-14"), "amount": 1400.0, "items": "ডিম ২ ডজন, মসুর ডাল ২ কেজি, লবণ, চিনি"},
    ]
    for b in bazars:
        post(
            f"{BASE_URL}/messes/{mess_id}/bazars",
            {
                "user_id": user_ids[b["shopper"]],
                "date": b["date"],
                "amount": b["amount"],
                "items": b["items"],
            },
            token=owner_token,
        )
    print(f"✓ Added 5 bazar records (Total: ৳11,500)")

    # 6. Add Member Deposits (Cash, bKash, Nagad)
    deposits = [
        {"user_id": user_ids[members[0]["phone"]], "amount": 8000.0, "method": "cash", "notes": "ক্যাশ হ্যান্ডওভার"},
        {"user_id": user_ids[members[1]["phone"]], "amount": 8500.0, "method": "bkash", "trx": "BKASH982314", "notes": "বিকাশ অ্যাপ"},
        {"user_id": user_ids[members[2]["phone"]], "amount": 9000.0, "method": "nagad", "trx": "NGD8827361", "notes": "নগদ পেমেন্ট"},
        {"user_id": user_ids[members[3]["phone"]], "amount": 7500.0, "method": "bkash", "trx": "BKASH771625", "notes": "বিকাশ ক্যাশইন"},
        {"user_id": user_ids[members[4]["phone"]], "amount": 8000.0, "method": "cash", "notes": "ক্যাশ প্রদান"},
    ]
    for d in deposits:
        post(
            f"{BASE_URL}/messes/{mess_id}/deposits",
            {
                "user_id": d["user_id"],
                "date": date.today().strftime("%Y-%m-01"),
                "amount": d["amount"],
                "method": d["method"],
                "transaction_id": d.get("trx"),
                "notes": d.get("notes"),
            },
            token=owner_token,
        )
    print("✓ Added 5 member deposits")

    # 7. Add Meal counts for 14 days
    today = date.today()
    for day_offset in range(14):
        d_str = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        meal_list = []
        for i, m in enumerate(members):
            # Vary meals slightly
            bf = 0.5 if (i + day_offset) % 3 != 0 else 0.0
            ln = 1.0 if (i + day_offset) % 5 != 0 else 0.0
            dn = 1.0
            is_off = (i == 4 and day_offset == 2) # Taskin off 1 day
            meal_list.append({
                "user_id": user_ids[m["phone"]],
                "breakfast": 0.0 if is_off else bf,
                "lunch": 0.0 if is_off else ln,
                "dinner": 0.0 if is_off else dn,
                "is_off": is_off,
            })
        post(
            f"{BASE_URL}/messes/{mess_id}/meals/batch",
            {"date": d_str, "meals": meal_list},
            token=owner_token,
        )
    print(f"✓ Added daily meals for 14 days for all 5 members")

    print("\n=== DEMO SEEDING COMPLETE! ===")
    print(f"মেসের নাম: {mess_name}")
    print(f"ইনভাইট কোড: {invite_code}")
    print("লগইন ক্রেডেনশিয়ালস:")
    print("  ১. মোঃ ইমোন (ম্যানেজার): 01711002233 / password123")
    print("  ২. তামিম ইকবাল (সদস্য):   01711002234 / password123")
    print("  ৩. মুশফিকুর রহিম (সদস্য): 01711002235 / password123")
    print("  ৪. সাকিব আল হাসান (সদস্য): 01711002236 / password123")
    print("  ৫. তাসকিন আহমেদ (সদস্য):   01711002237 / password123")

if __name__ == "__main__":
    main()
