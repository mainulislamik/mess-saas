"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Utensils,
  Calendar,
  Save,
  CheckCircle,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  CalendarDays,
  UserCheck,
  AlertTriangle,
  X,
  Flame,
  Ban,
} from "lucide-react";

export default function MealsPage() {
  const router = useRouter();
  const { user, currentMess, isLoading, portalMode } = useAuth();

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  // If in member mode or non-manager, show dedicated member self-service view
  const isMemberMode = portalMode === "member" || !isManagerOrOwner;

  /* =========================================================
     MEMBER SELF-SERVICE MEAL STATE & HANDLERS
  ========================================================= */
  const [memberSummary, setMemberSummary] = useState<any>(null);
  const [memberLoading, setMemberLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");

  const [bFast, setBFast] = useState(0.0);
  const [lunch, setLunch] = useState(0.0);
  const [dinner, setDinner] = useState(0.0);
  const [guestBFast, setGuestBFast] = useState(0.0);
  const [guestLunch, setGuestLunch] = useState(0.0);
  const [guestDinner, setGuestDinner] = useState(0.0);
  const [isOff, setIsOff] = useState(false);

  const [savingMemberMeal, setSavingMemberMeal] = useState(false);
  const [memberMsg, setMemberMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMemberSummary = async () => {
    if (!currentMess?.id) return;
    try {
      setMemberLoading(true);
      const res = await api.get(`/messes/${currentMess.id}/dashboard/my-summary`);
      setMemberSummary(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    if (isMemberMode && currentMess?.id) {
      fetchMemberSummary();
    }
  }, [isMemberMode, currentMess?.id]);

  useEffect(() => {
    if (!memberSummary) return;
    const dayData = selectedDay === "today" ? memberSummary.today : memberSummary.tomorrow;
    if (dayData) {
      setBFast(dayData.breakfast ?? 0.0);
      setLunch(dayData.lunch ?? 0.0);
      setDinner(dayData.dinner ?? 0.0);
      setGuestBFast(dayData.guest_breakfast ?? 0.0);
      setGuestLunch(dayData.guest_lunch ?? 0.0);
      setGuestDinner(dayData.guest_dinner ?? 0.0);
      setIsOff(dayData.is_off ?? false);
    }
  }, [selectedDay, memberSummary]);

  const handleSaveMemberMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess?.id) return;
    const targetDate = selectedDay === "today" ? memberSummary?.today?.date : memberSummary?.tomorrow?.date;
    const mealRules = memberSummary?.meal_rules || (currentMess as any)?.meal_rules || {};
    const maxGuest = Number(mealRules.max_guest_per_meal ?? 4);

    if (guestBFast > maxGuest || guestLunch > maxGuest || guestDinner > maxGuest) {
      setMemberMsg({
        type: "error",
        text: `প্রতি বেলায় সর্বোচ্চ ${maxGuest} টি মেহমান মিল দেওয়া যাবে।`,
      });
      return;
    }

    try {
      setSavingMemberMeal(true);
      setMemberMsg(null);
      const totalCount = bFast + lunch + dinner + guestBFast + guestLunch + guestDinner;
      await api.post(`/messes/${currentMess.id}/meals/me`, {
        date: targetDate,
        breakfast: bFast,
        lunch: lunch,
        dinner: dinner,
        guest_breakfast: guestBFast,
        guest_lunch: guestLunch,
        guest_dinner: guestDinner,
        is_off: isOff || totalCount === 0,
      });
      setMemberMsg({ type: "success", text: `${selectedDay === "today" ? "আজকের" : "আগামীকালের"} মিল সফলভাবে আপডেট করা হয়েছে!` });
      fetchMemberSummary();
    } catch (err: any) {
      setMemberMsg({ type: "error", text: err.response?.data?.detail || "মিল আপডেট করতে ব্যর্থ হয়েছে" });
    } finally {
      setSavingMemberMeal(false);
    }
  };

  /* =========================================================
     MANAGER BATCH MEAL STATE & HANDLERS
  ========================================================= */
  const [date, setDate] = useState("");
  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [managerLoading, setManagerLoading] = useState(true);
  const [savingBatch, setSavingBatch] = useState(false);
  const [managerMessage, setManagerMessage] = useState<string | null>(null);

  // Emergency Slot Modal State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencySlot, setEmergencySlot] = useState<"breakfast" | "lunch" | "dinner" | "all">("lunch");
  const [emergencyReason, setEmergencyReason] = useState<string>("bua_absent");
  const [emergencyCustomReason, setEmergencyCustomReason] = useState<string>("");
  const [emergencyAction, setEmergencyAction] = useState<"zero_out" | "hotel_food">("zero_out");
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess?.id) return;
    try {
      setEmergencySubmitting(true);
      const res = await api.post(`/messes/${currentMess.id}/meals/emergency-slot-void`, {
        date: date || new Date().toISOString().split("T")[0],
        slot: emergencySlot,
        reason: emergencyReason,
        custom_reason: emergencyReason === "custom" ? emergencyCustomReason.trim() : undefined,
        action: emergencyAction,
      });

      setShowEmergencyModal(false);
      setManagerMessage(res.data.message);
      fetchDaily();
      fetchMonthly();
    } catch (err: any) {
      alert(err.response?.data?.detail || "জরুরি অ্যাকশন সম্পন্ন করতে সমস্যা হয়েছে");
    } finally {
      setEmergencySubmitting(false);
    }
  };

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchDaily = async () => {
    if (!currentMess) return;
    try {
      const targetDate = date || new Date().toISOString().split("T")[0];
      const res = await api.get(`/messes/${currentMess.id}/meals?date=${targetDate}`);
      setDailyData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMonthly = async () => {
    if (!currentMess) return;
    try {
      const targetMonth = (date || new Date().toISOString().split("T")[0]).slice(0, 7);
      const res = await api.get(`/messes/${currentMess.id}/meals/monthly?month=${targetMonth}`);
      setMonthlySummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!isMemberMode && currentMess) {
      setManagerLoading(true);
      Promise.all([fetchDaily(), fetchMonthly()]).finally(() => setManagerLoading(false));
    }
  }, [user, currentMess, isLoading, date, isMemberMode, router]);

  const handleMealChange = (userId: string, field: "breakfast" | "lunch" | "dinner" | "is_off", val: any) => {
    if (!dailyData) return;
    const updated = dailyData.members.map((m: any) => {
      if (m.user_id === userId) {
        const item = { ...m, [field]: val };
        if (field === "is_off" && val === true) {
          item.breakfast = 0;
          item.lunch = 0;
          item.dinner = 0;
        }
        item.total_meals = item.is_off
          ? 0
          : round(
              Number(item.breakfast) +
                Number(item.lunch) +
                Number(item.dinner) +
                Number(item.guest_breakfast || 0) +
                Number(item.guest_lunch || 0) +
                Number(item.guest_dinner || 0),
              2
            );
        return item;
      }
      return m;
    });

    const totalDay = updated.reduce((acc: number, cur: any) => acc + (cur.total_meals || 0), 0);
    setDailyData({
      ...dailyData,
      total_day_meals: round(totalDay, 2),
      members: updated,
    });
  };

  const round = (num: number, decimals: number) => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  };

  const handleSaveBatch = async () => {
    if (!currentMess || !dailyData) return;
    setSavingBatch(true);
    setManagerMessage(null);
    try {
      await api.post(`/messes/${currentMess.id}/meals/batch`, {
        date,
        meals: dailyData.members.map((m: any) => ({
          user_id: m.user_id,
          breakfast: Number(m.breakfast),
          lunch: Number(m.lunch),
          dinner: Number(m.dinner),
          is_off: m.is_off,
          notes: m.notes,
        })),
      });
      setManagerMessage("আজকের মিল সফলভাবে সংরক্ষিত হয়েছে!");
      fetchMonthly();
    } catch (err: any) {
      setManagerMessage(err.response?.data?.detail || "সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setSavingBatch(false);
    }
  };

  const handleQuickDateChange = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  if (!currentMess) return null;

  /* =========================================================
     1. MEMBER VIEW (When portalMode === 'member' or not manager)
  ========================================================= */
  if (isMemberMode) {
    const activeDayData = selectedDay === "today" ? memberSummary?.today : memberSummary?.tomorrow;
    const slotStatus = activeDayData?.slot_status || {};

    const bFastAllowed = slotStatus?.breakfast?.allowed ?? true;
    const lunchAllowed = slotStatus?.lunch?.allowed ?? true;
    const dinnerAllowed = slotStatus?.dinner?.allowed ?? true;

    const mealRules = memberSummary?.meal_rules || (currentMess as any)?.meal_rules || {};
    const allowGuest = mealRules.allow_guest_meals ?? true;
    const maxGuest = Number(mealRules.max_guest_per_meal ?? 4);

    return (
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              <span>মেস সদস্য পোর্টাল</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Utensils className="w-7 h-7 text-emerald-600" /> আমার মিল পরিচালনা ও রিকোয়েস্ট
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              সদস্য হিসেবে আপনি শুধুমাত্র আপনার নিজের মিল (আজ ও আগামীকাল অগ্রিম) নিয়ন্ত্রণ করতে পারেন।
            </p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setSelectedDay("today")}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                selectedDay === "today"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>আজকের মিল ({memberSummary?.today?.date || "আজ"})</span>
            </button>
            <button
              onClick={() => setSelectedDay("tomorrow")}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                selectedDay === "tomorrow"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>আগামীকাল অগ্রিম ({memberSummary?.tomorrow?.date || "কাল"})</span>
            </button>
          </div>
        </div>

        {memberMsg && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 border ${
              memberMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {memberMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{memberMsg.text}</span>
          </div>
        )}

        {/* Meal Edit Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedDay === "today" ? "আজকের" : "আগামীকালের"} মিল নির্বাচন
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                যেসব বেলার খাবার খাবেন শুধু সেগুলো চালু রাখুন। কোনো বেলা না খেলে ০.০ (বন্ধ) রাখুন।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (bFast > 0 || lunch > 0 || dinner > 0) {
                    // Turn all off
                    if (bFastAllowed) setBFast(0);
                    if (lunchAllowed) setLunch(0);
                    if (dinnerAllowed) setDinner(0);
                    setIsOff(true);
                  } else {
                    // Quick enable normal full-day (Lunch 1 + Dinner 1)
                    if (lunchAllowed) setLunch(1.0);
                    if (dinnerAllowed) setDinner(1.0);
                    setIsOff(false);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  bFast > 0 || lunch > 0 || dinner > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {bFast > 0 || lunch > 0 || dinner > 0
                  ? "❌ সব মিল বন্ধ করুন (সব ০.০)"
                  : "⚡ সাধারণ মিল চালু (দুপুর ১ + রাত ১)"}
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveMemberMeal} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Breakfast Card */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isOff
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : bFast > 0
                    ? "bg-amber-50/40 border-amber-300"
                    : "bg-slate-50/60 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">সকালের নাস্তা</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      bFastAllowed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {bFastAllowed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {bFastAllowed ? "উন্মুক্ত" : "কাট-অফ শেষ"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-200/60 mt-2">
                  <span className="text-xs text-slate-600 font-semibold">আমার নাস্তা (০.৫ মিল):</span>
                  <button
                    type="button"
                    disabled={!bFastAllowed}
                    onClick={() => {
                      setIsOff(false);
                      setBFast(bFast > 0 ? 0 : 0.5);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                      bFast > 0 && !isOff
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {bFast > 0 && !isOff ? "চালু আছে (০.৫)" : "বন্ধ (০.০)"}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-600 font-medium">মেহমান নাস্তা:</span>
                    <span className="text-[10px] text-slate-400">সর্বোচ্চ {maxGuest} টি</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {guestBFast > 0 && (
                      <button
                        type="button"
                        disabled={!bFastAllowed}
                        onClick={() => {
                          setIsOff(false);
                          setGuestBFast(Math.max(0, guestBFast - 1));
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm flex items-center justify-center hover:bg-rose-100 disabled:opacity-40 cursor-pointer shadow-2xs transition"
                        title="১ জন মেহমান কমান"
                      >
                        -
                      </button>
                    )}
                    <span className="min-w-6 px-1 text-center text-xs font-extrabold text-slate-800 font-mono">
                      {guestBFast}
                    </span>
                    <button
                      type="button"
                      disabled={!bFastAllowed || guestBFast >= maxGuest || !allowGuest}
                      onClick={() => {
                        setIsOff(false);
                        setGuestBFast(Math.min(maxGuest, guestBFast + 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition"
                      title={guestBFast >= maxGuest ? `সর্বোচ্চ ${maxGuest} টি অনুমোদনযোগ্য` : "১ জন মেহমান যোগ করুন"}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!bFastAllowed && slotStatus?.breakfast?.reason && (
                  <p className="text-[11px] text-rose-600 mt-2 font-medium">
                    {slotStatus.breakfast.reason}
                  </p>
                )}
              </div>

              {/* Lunch Card */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isOff
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : lunch > 0
                    ? "bg-emerald-50/40 border-emerald-300"
                    : "bg-slate-50/60 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">দুপুরের খাবার</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      lunchAllowed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {lunchAllowed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {lunchAllowed ? "উন্মুক্ত" : "কাট-অফ শেষ"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-200/60 mt-2">
                  <span className="text-xs text-slate-600 font-semibold">আমার দুপুরের মিল:</span>
                  <button
                    type="button"
                    disabled={!lunchAllowed}
                    onClick={() => {
                      setIsOff(false);
                      setLunch(lunch > 0 ? 0 : 1.0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                      lunch > 0 && !isOff
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {lunch > 0 && !isOff ? "চালু আছে (১.০)" : "বন্ধ (০.০)"}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-600 font-medium">মেহমান দুপুর:</span>
                    <span className="text-[10px] text-slate-400">সর্বোচ্চ {maxGuest} টি</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {guestLunch > 0 && (
                      <button
                        type="button"
                        disabled={!lunchAllowed}
                        onClick={() => {
                          setIsOff(false);
                          setGuestLunch(Math.max(0, guestLunch - 1));
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm flex items-center justify-center hover:bg-rose-100 disabled:opacity-40 cursor-pointer shadow-2xs transition"
                        title="১ জন মেহমান কমান"
                      >
                        -
                      </button>
                    )}
                    <span className="min-w-6 px-1 text-center text-xs font-extrabold text-slate-800 font-mono">
                      {guestLunch}
                    </span>
                    <button
                      type="button"
                      disabled={!lunchAllowed || guestLunch >= maxGuest || !allowGuest}
                      onClick={() => {
                        setIsOff(false);
                        setGuestLunch(Math.min(maxGuest, guestLunch + 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition"
                      title={guestLunch >= maxGuest ? `সর্বোচ্চ ${maxGuest} টি অনুমোদনযোগ্য` : "১ জন মেহমান যোগ করুন"}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!lunchAllowed && slotStatus?.lunch?.reason && (
                  <p className="text-[11px] text-rose-600 mt-2 font-medium">
                    {slotStatus.lunch.reason}
                  </p>
                )}
              </div>

              {/* Dinner Card */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isOff
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : dinner > 0
                    ? "bg-indigo-50/40 border-indigo-300"
                    : "bg-slate-50/60 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">রাতের খাবার</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      dinnerAllowed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {dinnerAllowed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {dinnerAllowed ? "উন্মুক্ত" : "কাট-অফ শেষ"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-200/60 mt-2">
                  <span className="text-xs text-slate-600 font-semibold">আমার রাতের মিল:</span>
                  <button
                    type="button"
                    disabled={!dinnerAllowed}
                    onClick={() => {
                      setIsOff(false);
                      setDinner(dinner > 0 ? 0 : 1.0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                      dinner > 0 && !isOff
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {dinner > 0 && !isOff ? "চালু আছে (১.০)" : "বন্ধ (০.০)"}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-600 font-medium">মেহমান রাত:</span>
                    <span className="text-[10px] text-slate-400">সর্বোচ্চ {maxGuest} টি</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {guestDinner > 0 && (
                      <button
                        type="button"
                        disabled={!dinnerAllowed}
                        onClick={() => {
                          setIsOff(false);
                          setGuestDinner(Math.max(0, guestDinner - 1));
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm flex items-center justify-center hover:bg-rose-100 disabled:opacity-40 cursor-pointer shadow-2xs transition"
                        title="১ জন মেহমান কমান"
                      >
                        -
                      </button>
                    )}
                    <span className="min-w-6 px-1 text-center text-xs font-extrabold text-slate-800 font-mono">
                      {guestDinner}
                    </span>
                    <button
                      type="button"
                      disabled={!dinnerAllowed || guestDinner >= maxGuest || !allowGuest}
                      onClick={() => {
                        setIsOff(false);
                        setGuestDinner(Math.min(maxGuest, guestDinner + 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition"
                      title={guestDinner >= maxGuest ? `সর্বোচ্চ ${maxGuest} টি অনুমোদনযোগ্য` : "১ জন মেহমান যোগ করুন"}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!dinnerAllowed && slotStatus?.dinner?.reason && (
                  <p className="text-[11px] text-rose-600 mt-2 font-medium">
                    {slotStatus.dinner.reason}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>কাট-অফ সময়ের পরে পরিবর্তনের জন্য মেস ম্যানেজারের সাথে সরাসরি যোগাযোগ করুন।</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {selectedDay === "today" ? "আজকের" : "আগামীকালের"} মোট নির্বাচিত মিল:{" "}
                  <span className="text-emerald-700 font-extrabold text-sm font-mono">
                    {(bFast + lunch + dinner + guestBFast + guestLunch + guestDinner).toFixed(1)} টি
                  </span>
                </span>
              </div>

              <button
                type="submit"
                disabled={savingMemberMeal}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {savingMemberMeal ? "সংরক্ষণ হচ্ছে..." : "আমার মিল সংরক্ষণ করুন"}
              </button>
            </div>
          </form>
        </div>

        {/* My Personal Monthly Meals History Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                চলতি মাসে আমার মিলের বিস্তারিত খতিয়ান
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                প্রতিদিনের খাওয়ার পরিমাণ ও মেহমান মিলের হিসাব
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500">এই মাসে মোট মিল: </span>
              <span className="font-extrabold text-emerald-700 text-lg">
                {memberSummary?.total_meals_count ?? 0} টি
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">তারিখ</th>
                  <th className="px-4 py-3.5 text-center">সকালের নাস্তা</th>
                  <th className="px-4 py-3.5 text-center">দুপুরের খাবার</th>
                  <th className="px-4 py-3.5 text-center">রাতের খাবার</th>
                  <th className="px-4 py-3.5 text-center">মেহমান মিল</th>
                  <th className="px-6 py-3.5 text-right">মোট মিল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {memberSummary?.monthly_history && memberSummary.monthly_history.length > 0 ? (
                  memberSummary.monthly_history.map((h: any) => {
                    const guestTotal =
                      (h.guest_breakfast || 0) + (h.guest_lunch || 0) + (h.guest_dinner || 0);
                    return (
                      <tr key={h.date} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-800 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-slate-400" />
                          {h.date}
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium">
                          {h.is_off ? "—" : h.breakfast > 0 ? `${h.breakfast} টি` : "০"}
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium">
                          {h.is_off ? "—" : h.lunch > 0 ? `${h.lunch} টি` : "০"}
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium">
                          {h.is_off ? "—" : h.dinner > 0 ? `${h.dinner} টি` : "০"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-xs">
                          {guestTotal > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              +{guestTotal} টি
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-slate-900">
                          {h.is_off ? (
                            <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                              বন্ধ (OFF)
                            </span>
                          ) : (
                            `${h.total_meals} টি`
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                      এই মাসে এখনো কোনো মিল রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     2. MANAGER VIEW (When portalMode === 'manager' and isManagerOrOwner)
  ========================================================= */
  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>মেস ম্যানেজমেন্ট কন্ট্রোল প্যানেল</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-emerald-600" /> প্রতিদিনের মিল কাউন্ট ও মাস্টার শিট
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            সকল মেম্বারদের সকালের নাস্তা (০.৫), দুপুর (১) ও রাতের (১) মিল এন্ট্রি ও পরিচালনা করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickDateChange(-1)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="আগের দিন"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-3.5 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
          <button
            onClick={() => handleQuickDateChange(1)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="পরের দিন"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {managerMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{managerMessage}</span>
        </div>
      )}

      {/* Daily Table Card for Managers */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              তারিখের মিল শিট ({date})
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              মোট মিল খাওয়া হয়েছে:{" "}
              <span className="font-extrabold text-emerald-700 text-sm">
                {dailyData?.total_day_meals || 0} টি
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="খালা না আসলে বা গ্যাস না থাকলে এক ক্লিকে মিল শূন্য করুন"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              জরুরি স্লট বাতিল / রান্না বন্ধ
            </button>

            <button
              onClick={handleSaveBatch}
              disabled={savingBatch}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingBatch ? "সংরক্ষণ হচ্ছে..." : "সব মিল সংরক্ষণ করুন"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">মেম্বার</th>
                <th className="px-4 py-4 text-center">নাস্তা (০.৫)</th>
                <th className="px-4 py-4 text-center">দুপুর (১.০)</th>
                <th className="px-4 py-4 text-center">রাত (১.০)</th>
                <th className="px-4 py-4 text-center">মিল বন্ধ (OFF)</th>
                <th className="px-6 py-4 text-right">মোট মিল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyData?.members?.map((m: any) => (
                <tr
                  key={m.user_id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    m.user_id === user?.id ? "bg-emerald-50/20" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {m.user_name}
                    {m.user_id === user?.id && (
                      <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        আপনি
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      disabled={m.is_off}
                      value={m.breakfast}
                      onChange={(e) =>
                        handleMealChange(m.user_id, "breakfast", parseFloat(e.target.value) || 0)
                      }
                      className="w-16 text-center py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      disabled={m.is_off}
                      value={m.lunch}
                      onChange={(e) =>
                        handleMealChange(m.user_id, "lunch", parseFloat(e.target.value) || 0)
                      }
                      className="w-16 text-center py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      disabled={m.is_off}
                      value={m.dinner}
                      onChange={(e) =>
                        handleMealChange(m.user_id, "dinner", parseFloat(e.target.value) || 0)
                      }
                      className="w-16 text-center py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={m.is_off}
                      onChange={(e) =>
                        handleMealChange(m.user_id, "is_off", e.target.checked)
                      }
                      className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-base">
                    {m.total_meals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Summary Card for Managers */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              চলতি মাসের মোট মিল তালিকা ({date.slice(0, 7)})
            </h2>
            <p className="text-xs text-slate-500">প্রতিটি মেম্বার এই মাসে কতগুলো মিল খেয়েছেন</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthlySummary.map((mem) => (
            <div
              key={mem.user_id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
            >
              <div className="font-bold text-slate-900 text-sm">{mem.user_name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                সিট: {mem.seat_label || "সাধারণ"}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-xs font-medium text-slate-600">মোট মিল:</span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {mem.total_meals} <span className="text-xs font-normal text-slate-500">টি</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Meal Slot Void Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900">জরুরি স্লট বাতিল / রান্না বন্ধ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              বুয়া/খালা না আসলে বা গ্যাস সংকটে রান্না না হলে এক ক্লিকে সংশ্লিষ্ট বেলার মিল শূন্য (০.০) করুন যাতে কোনো মেম্বারের টাকা না কাটে।
            </p>

            <form onSubmit={handleEmergencySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কোন বেলার রান্না হয়নি?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "lunch", label: "দুপুর (Lunch)" },
                    { id: "dinner", label: "রাত (Dinner)" },
                    { id: "breakfast", label: "নাস্তা (Breakfast)" },
                    { id: "all", label: "সারাদিনের সকল মিল" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEmergencySlot(s.id as any)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        emergencySlot === s.id
                          ? "bg-rose-50 border-rose-300 text-rose-800"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">রান্না না হওয়ার কারণ</label>
                <select
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="bua_absent">খালা / বুয়া আসেনি (কামাই)</option>
                  <option value="no_gas">গ্যাস সংকট / সিলিন্ডার শেষ</option>
                  <option value="water_issue">পানি বা বিদ্যুৎ সমস্যা</option>
                  <option value="custom">অন্যান্য বিশেষ কারণ</option>
                </select>
              </div>

              {emergencyReason === "custom" && (
                <div>
                  <input
                    type="text"
                    value={emergencyCustomReason}
                    onChange={(e) => setEmergencyCustomReason(e.target.value)}
                    placeholder="কারণ সংক্ষেপে লিখুন (যেমন: মেস ছুটির সিদ্ধান্ত)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-xs font-medium text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">করণীয় ব্যবস্থা</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="emergencyAction"
                      value="zero_out"
                      checked={emergencyAction === "zero_out"}
                      onChange={() => setEmergencyAction("zero_out")}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">মিল শূন্যকরণ (সবাই নিজ দায়িত্বে খাবে)</span>
                      <span className="text-slate-500 text-[11px]">মেম্বারদের ওই বেলার মিল ০.০ হবে, কোনো টাকা কাটা হবে না</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="emergencyAction"
                      value="hotel_food"
                      checked={emergencyAction === "hotel_food"}
                      onChange={() => setEmergencyAction("hotel_food")}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">মেস থেকে হোটেল খাবার আনা হয়েছে</span>
                      <span className="text-slate-500 text-[11px]">মেম্বারদের মিল চালু থাকবে, হোটেল বিল বাজারে যুক্ত হবে</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={emergencySubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {emergencySubmitting ? "প্রসেস হচ্ছে..." : "অ্যাকশন কার্যকর করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
