"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Wallet,
  UtensilsCrossed,
  Home,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Clock,
  ShieldAlert,
  Send,
  UserCheck,
  TrendingDown,
  TrendingUp,
  DollarSign
} from "lucide-react";

export default function MemberDashboardView() {
  const { currentMess } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Today meal state
  const [breakfast, setBreakfast] = useState(0.0);
  const [lunch, setLunch] = useState(1.0);
  const [dinner, setDinner] = useState(1.0);
  const [isOff, setIsOff] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealSuccess, setMealSuccess] = useState(false);

  // Deposit request state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("bKash");
  const [trxId, setTrxId] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  const fetchSummary = async () => {
    if (!currentMess?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/messes/${currentMess.id}/dashboard/my-summary`);
      setSummary(res.data);
      if (res.data?.today) {
        setBreakfast(res.data.today.breakfast);
        setLunch(res.data.today.lunch);
        setDinner(res.data.today.dinner);
        setIsOff(res.data.today.is_off);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "ব্যক্তিগত হিসাব লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [currentMess?.id]);

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess?.id) return;
    try {
      setSavingMeal(true);
      setMealSuccess(false);
      await api.post(`/messes/${currentMess.id}/meals/me`, {
        date: summary?.today?.date || new Date().toISOString().split("T")[0],
        breakfast,
        lunch,
        dinner,
        is_off: isOff,
      });
      setMealSuccess(true);
      await fetchSummary();
      setTimeout(() => setMealSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "মিল আপডেট করতে ব্যর্থ হয়েছে।");
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess?.id || !depositAmount) return;
    try {
      setSubmittingDeposit(true);
      setDepositSuccess(false);
      await api.post(`/messes/${currentMess.id}/deposits`, {
        user_id: summary?.user_id,
        amount: parseFloat(depositAmount),
        date: new Date().toISOString().split("T")[0],
        method: depositMethod,
        transaction_id: trxId || undefined,
        notes: depositNotes || "মেম্বার ডিপোজিট রিকোয়েস্ট",
      });
      setDepositSuccess(true);
      setDepositAmount("");
      setTrxId("");
      setDepositNotes("");
      await fetchSummary();
      setTimeout(() => setDepositSuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "ডিপোজিট রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে।");
    } finally {
      setSubmittingDeposit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">আপনার ব্যক্তিগত পোর্টাল লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900 mb-1">হিসাব লোড করা যায়নি</h3>
        <p className="text-sm text-rose-700 mb-4">{error || "তথ্য পাওয়া যায়নি।"}</p>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition"
        >
          পুনরায় চেষ্টা করুন
        </button>
      </div>
    );
  }

  const isSurplus = summary.net_balance >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Status Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 opacity-20 pointer-events-none transform skew-x-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-bold tracking-wide uppercase">
                👤 সদস্য পোর্টাল (Member Portal)
              </span>
              <span className="text-xs text-slate-300">মাস: {summary.month}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              স্বাগতম, {summary.user_name} Sir! 👋
            </h1>
            <p className="text-emerald-100/80 text-sm mt-1">
              {summary.mess_name} • আসন: {summary.seat_label || "জেনারেল"} • ফোন: {summary.phone}
            </p>
          </div>

          {/* Balance Highlight Card */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 ${
            isSurplus ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200" : "bg-rose-950/60 border-rose-500/40 text-rose-200"
          }`}>
            <div className={`p-3 rounded-xl ${isSurplus ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
              {isSurplus ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold opacity-90">
                {isSurplus ? "আপনার পাওনা (Surplus)" : "আপনার বকেয়া (Due)"}
              </p>
              <p className="text-2xl md:text-3xl font-black">
                ৳ {Math.abs(summary.net_balance).toLocaleString("en-BD")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">মোট জমা (Deposit)</span>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">৳ {summary.my_total_deposit.toLocaleString("en-BD")}</p>
          <p className="text-xs text-slate-500 mt-1">অনুমোদিত ক্যাশ/বিকাশ জমা</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">আমার মিল (Meals)</span>
            <UtensilsCrossed className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.my_month_meals} টি</p>
          <p className="text-xs text-teal-700 mt-1">মিল খরচ: ৳ {summary.my_meal_cost.toLocaleString("en-BD")}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ফিক্সড খরচ ভাগ</span>
            <Home className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">৳ {summary.my_fixed_cost_share.toLocaleString("en-BD")}</p>
          <p className="text-xs text-slate-500 mt-1">ভাড়া + বুয়া + ইউটিলিটি</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">চলতি মিল রেট</span>
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">৳ {summary.estimated_meal_rate}</p>
          <p className="text-xs text-slate-500 mt-1">বর্তমান প্রাক্কলিত হার</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Daily Meal Preference Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-emerald-600" /> আজকের মিল পছন্দ ও স্ট্যাটাস
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">তারিখ: {summary.today.date} (কাট-অফ সময়: বিকাল ৫:০০)</p>
            </div>
            {mealSuccess && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> সংরক্ষিত হয়েছে!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveMeal} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Breakfast */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  সকালের নাস্তা (Breakfast)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBreakfast(0.0)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      breakfast === 0 ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    বন্ধ (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakfast(0.5)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      breakfast === 0.5 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    চালু (0.5)
                  </button>
                </div>
              </div>

              {/* Lunch */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  দুপুরের খাবার (Lunch)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLunch(0.0)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      lunch === 0 ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    বন্ধ (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLunch(1.0)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      lunch === 1.0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    চালু (1.0)
                  </button>
                </div>
              </div>

              {/* Dinner */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  রাতের খাবার (Dinner)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDinner(0.0)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      dinner === 0 ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    বন্ধ (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDinner(1.0)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      dinner === 1.0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    চালু (1.0)
                  </button>
                </div>
              </div>
            </div>

            {/* Total calculated & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-sm font-semibold text-slate-700">
                আজ মোট মিল হবে: <span className="text-emerald-600 font-extrabold text-lg">{(breakfast + lunch + dinner).toFixed(1)} টি</span>
              </div>
              <button
                type="submit"
                disabled={savingMeal}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingMeal ? "সংরক্ষণ হচ্ছে..." : "মিল স্ট্যাটাস আপডেট করুন"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Send Deposit Request */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-600" /> টাকা জমার স্লিপ পাঠান
              </h2>
              {depositSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> সফল!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">
              বিকাশ/নগদ বা ক্যাশ জমা দেওয়ার পর ট্রানজেকশন আইডি সহ এখানে রিকোয়েস্ট পাঠান। ম্যানেজার যাচাই করে অনুমোদন করবেন।
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পরিমাণ (টাকা)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="যেমন: ২০০০"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Rocket">রকেট (Rocket)</option>
                    <option value="Cash">ক্যাশ (Cash)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">TrxID (যদি থাকে)</label>
                  <input
                    type="text"
                    placeholder="9H87G6F5"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোট / বিবরণ</label>
                <input
                  type="text"
                  placeholder="যেমন: মার্চ মাসের অগ্রিম জমা"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingDeposit}
                className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2"
              >
                <Send className="w-4 h-4" /> {submittingDeposit ? "পাঠানো হচ্ছে..." : "ডিপোজিট রিকোয়েস্ট পাঠান"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Recent Deposits & Mess Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Recent Deposits */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" /> আপনার সাম্প্রতিক জমাসমূহ
          </h2>
          <div className="space-y-3">
            {summary.my_deposits && summary.my_deposits.length > 0 ? (
              summary.my_deposits.map((d: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">৳ {d.amount} ({d.method})</p>
                    <p className="text-xs text-slate-500">{d.date} {d.transaction_id ? `• Trx: ${d.transaction_id}` : ""}</p>
                  </div>
                  <div>
                    {d.is_verified ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">অনুমোদিত</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">অপেক্ষমাণ</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">চলতি মাসে কোনো জমার রেকর্ড নেই।</p>
            )}
          </div>
        </div>

        {/* Mess Quick Overview */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600" /> মেসের সামগ্রিক পরিসংখ্যান ({summary.month})
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <p className="text-xs text-indigo-700 font-semibold uppercase">মেসের মোট মিল</p>
              <p className="text-xl font-black text-indigo-950 mt-1">{summary.mess_total_meals} টি</p>
            </div>
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100">
              <p className="text-xs text-teal-700 font-semibold uppercase">মেসের মোট বাজার</p>
              <p className="text-xl font-black text-teal-950 mt-1">৳ {summary.mess_total_bazar.toLocaleString("en-BD")}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <p className="text-xs text-emerald-700 font-semibold uppercase">মোট সংগৃহীত জমা</p>
              <p className="text-xl font-black text-emerald-950 mt-1">৳ {summary.mess_total_deposit.toLocaleString("en-BD")}</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
              <p className="text-xs text-amber-700 font-semibold uppercase">সক্রিয় সদস্য</p>
              <p className="text-xl font-black text-amber-950 mt-1">{summary.active_member_count} জন</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
