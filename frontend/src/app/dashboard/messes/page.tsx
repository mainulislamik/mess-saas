"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  Copy,
  Check,
  PlusCircle,
  Share2,
  Shield,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Sliders,
  Save,
} from "lucide-react";

export default function MessSettingsPage() {
  const router = useRouter();
  const { user, currentMess, userMesses, refreshMesses, setCurrentMess, isLoading } = useAuth();

  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [copied, setCopied] = useState(false);

  // Create Mess Form
  const [newName, setNewName] = useState("");
  const [newDistrict, setNewDistrict] = useState("Dhaka");
  const [newThana, setNewThana] = useState("");
  const [newArea, setNewArea] = useState("");
  const [creating, setCreating] = useState(false);

  // Join Mess Form
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  // Meal Rules State
  const [breakfastUnit, setBreakfastUnit] = useState<number>(0.5);
  const [breakfastCutoff, setBreakfastCutoff] = useState<string>("22:00");
  const [breakfastPrevDay, setBreakfastPrevDay] = useState<boolean>(true);
  const [lunchCutoff, setLunchCutoff] = useState<string>("09:00");
  const [dinnerCutoff, setDinnerCutoff] = useState<string>("17:00");
  const [allowGuest, setAllowGuest] = useState<boolean>(true);
  const [maxGuest, setMaxGuest] = useState<number>(3);
  const [savingRules, setSavingRules] = useState<boolean>(false);
  const [rulesSuccess, setRulesSuccess] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!currentMess) return;
    setLoadingMembers(true);
    try {
      const res = await api.get(`/messes/${currentMess.id}/members`);
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchMealRules = async () => {
    if (!currentMess) return;
    try {
      const res = await api.get(`/messes/${currentMess.id}/meal-rules`);
      if (res.data) {
        setBreakfastUnit(res.data.breakfast_unit ?? 0.5);
        setBreakfastCutoff(res.data.breakfast_cutoff_time ?? "22:00");
        setBreakfastPrevDay(res.data.breakfast_cutoff_prev_day ?? true);
        setLunchCutoff(res.data.lunch_cutoff_time ?? "09:00");
        setDinnerCutoff(res.data.dinner_cutoff_time ?? "17:00");
        setAllowGuest(res.data.allow_guest_meals ?? true);
        setMaxGuest(res.data.max_guest_per_meal ?? 3);
      }
    } catch (err) {
      console.error("Failed to load meal rules", err);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (currentMess) {
      fetchMembers();
      if (isManagerOrOwner) {
        fetchMealRules();
      }
    }
  }, [user, currentMess, isLoading, router, isManagerOrOwner]);

  const handleSaveMealRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess) return;
    setSavingRules(true);
    setRulesSuccess(null);
    try {
      await api.patch(`/messes/${currentMess.id}/meal-rules`, {
        breakfast_unit: Number(breakfastUnit),
        breakfast_cutoff_time: breakfastCutoff,
        breakfast_cutoff_prev_day: breakfastPrevDay,
        lunch_cutoff_time: lunchCutoff,
        dinner_cutoff_time: dinnerCutoff,
        allow_guest_meals: allowGuest,
        max_guest_per_meal: Number(maxGuest),
      });
      await refreshMesses();
      setRulesSuccess("মেস মিল রুলস ও সময়সীমা সফলভাবে সংরক্ষিত হয়েছে!");
      setTimeout(() => setRulesSuccess(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "রুলস সেভ করা সম্ভব হয়নি");
    } finally {
      setSavingRules(false);
    }
  };

  const handleCopyInvite = () => {
    if (!currentMess) return;
    navigator.clipboard.writeText(currentMess.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/messes", {
        name: newName,
        district: newDistrict,
        thana: newThana || null,
        area: newArea || null,
      });
      await refreshMesses();
      setCurrentMess(res.data);
      setNewName("");
      setNewThana("");
      setNewArea("");
      alert("নতুন মেস সফলভাবে তৈরি করা হয়েছে!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "মেস তৈরি করা সম্ভব হয়নি");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setJoinMsg(null);
    setJoinError(null);
    try {
      const res = await api.post(`/messes/join/${inviteCode.toUpperCase()}`);
      await refreshMesses();
      setCurrentMess(res.data);
      setJoinMsg("অভিনন্দন! মেসে সফলভাবে যুক্ত হয়েছেন।");
      setInviteCode("");
    } catch (err: any) {
      setJoinError(err.response?.data?.detail || "ইনভাইট কোড ভুল বা মেস খুঁজে পাওয়া যায়নি");
    } finally {
      setJoining(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!currentMess) return;
    try {
      await api.patch(`/messes/${currentMess.id}/members/${targetUserId}`, {
        role: newRole,
      });
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "রোল পরিবর্তন করা যায়নি");
    }
  };

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" /> মেস সেটিংস ও মেম্বার ব্যবস্থাপনা
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              ইনভাইট কোড শেয়ার করুন, নতুন মেস খুলুন অথবা বন্ধুদের মেসে যোগ দিন
            </p>
          </div>
        </div>

        {/* Current Mess Invite Banner */}
        {currentMess && (
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                আপনার সক্রিয় মেস
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">{currentMess.name}</h2>
              <p className="text-emerald-100 text-sm mt-1">
                {currentMess.area ? `${currentMess.area}, ` : ""}
                {currentMess.thana ? `${currentMess.thana}, ` : ""}
                {currentMess.district || "বাংলাদেশ"}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <div className="text-[11px] font-semibold text-emerald-200 uppercase">
                  মেস ইনভাইট কোড
                </div>
                <div className="text-2xl font-mono font-black tracking-widest text-amber-300">
                  {currentMess.invite_code}
                </div>
              </div>
              <button
                onClick={handleCopyInvite}
                className="px-4 py-2 bg-white text-emerald-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow hover:bg-emerald-50 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "কপি হয়েছে!" : "কোড কপি করুন"}
              </button>
            </div>
          </div>
        )}

        {/* Manager Meal Rules & Cut-off Policy Customization */}
        {currentMess && isManagerOrOwner && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    মেস মিল রুলস ও সময়সীমা সেটিংস
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    কাট-অফ সময়, সকালের নাস্তার মিল রেট ও মেহমান মিল পলিসি নির্ধারণ করুন
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> বাংলাদেশ সময় (UTC+6) অনুযায়ী কার্যকর
              </span>
            </div>

            {rulesSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center gap-3 shadow-xs">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{rulesSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveMealRules} className="space-y-6">
              {/* Option 1: Breakfast Unit Weight */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
                <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-600" /> সকালের নাস্তার মিল কাউন্ট (Breakfast Unit Rate)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  সকালের নাস্তাকে হাফ মিল (০.৫) নাকি পুরো এক মিল (১.০) হিসেবে গণ্য করা হবে?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  <button
                    type="button"
                    onClick={() => setBreakfastUnit(0.5)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      breakfastUnit === 0.5
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">০.৫ মিল (অর্ধেক মিল)</div>
                      <div className="text-xs text-slate-500 font-normal">হালকা নাস্তা (ডিম/পরোটা/খিচুড়ি)</div>
                    </div>
                    {breakfastUnit === 0.5 && <Check className="w-5 h-5 text-emerald-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBreakfastUnit(1.0)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      breakfastUnit === 1.0
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">১.০ মিল (পুরো এক মিল)</div>
                      <div className="text-xs text-slate-500 font-normal">ভারী নাস্তা বা ১ মিল কাউন্ট</div>
                    </div>
                    {breakfastUnit === 1.0 && <Check className="w-5 h-5 text-emerald-600" />}
                  </button>
                </div>
              </div>

              {/* Option 2: Meal Cut-off Times */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> বেলার কাট-অফ সময়সীমা (Meal Cut-off Limits)
                </label>
                <p className="text-xs text-slate-500">
                  নির্ধারিত সময়ের পর সাধারণ সদস্যরা মিল অন/অফ করতে পারবে না (বাটন লক হয়ে যাবে)।
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Breakfast Cut-off */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span>সকালের নাস্তা</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        কাট-অফ সময় (২৪ ঘণ্টা ফরম্যাট)
                      </label>
                      <input
                        type="time"
                        value={breakfastCutoff}
                        onChange={(e) => setBreakfastCutoff(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={breakfastPrevDay}
                        onChange={(e) => setBreakfastPrevDay(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-xs text-slate-600 font-medium">
                        আগের দিন রাতে কার্যকর (সকালে পরিবর্তন বন্ধ থাকবে)
                      </span>
                    </label>
                  </div>

                  {/* Lunch Cut-off */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>দুপুরের খাবার</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        কাট-অফ সময় (২৪ ঘণ্টা ফরম্যাট)
                      </label>
                      <input
                        type="time"
                        value={lunchCutoff}
                        onChange={(e) => setLunchCutoff(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      সেদিন এই সময়ের পর দুপুরের মিল এন্ট্রি লক হয়ে যাবে (উদা: ০৯:০০ AM)।
                    </p>
                  </div>

                  {/* Dinner Cut-off */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>রাতের খাবার</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        কাট-অফ সময় (২৪ ঘণ্টা ফরম্যাট)
                      </label>
                      <input
                        type="time"
                        value={dinnerCutoff}
                        onChange={(e) => setDinnerCutoff(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      সেদিন এই সময়ের পর রাতের মিল এন্ট্রি লক হয়ে যাবে (উদা: ১৭:০০ বা বিকাল ৫টা)।
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 3: Guest Meals Policy */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" /> মেহমান / গেস্ট মিল পলিসি (Guest Meals)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      সদস্যরা কি তাদের মিল অর্ডারের সাথে মেহমানের মিল যুক্ত করতে পারবে?
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowGuest}
                      onChange={(e) => setAllowGuest(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    <span className="ml-3 text-xs font-bold text-slate-800">
                      {allowGuest ? "অনুমোদিত" : "বন্ধ"}
                    </span>
                  </label>
                </div>

                {allowGuest && (
                  <div className="pt-2 border-t border-slate-200/60 max-w-sm">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      প্রতি বেলায় সদস্যপ্রতি সর্বোচ্চ মেহমান মিল সংখ্যা
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={maxGuest}
                        onChange={(e) => setMaxGuest(Number(e.target.value))}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                      <span className="text-xs text-slate-500">টি মিল (প্রতি বেলা সর্বোচ্চ)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingRules}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingRules ? "সংরক্ষণ হচ্ছে..." : "নিয়মাবলী সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Member Management Section */}
        {currentMess && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> বর্তমান মেম্বার তালিকা ({members.length} জন)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  মেম্বারদের ভূমিকা ও সিট লেবেল নির্ধারণ করুন
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">নাম</th>
                    <th className="px-6 py-4">মোবাইল নম্বর</th>
                    <th className="px-6 py-4">ভূমিকা (Role)</th>
                    <th className="px-6 py-4">সিট</th>
                    {isManagerOrOwner && <th className="px-6 py-4 text-center">ম্যানেজ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.user_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {m.user_name || m.user?.name || "সদস্য"}
                        {m.user_id === user?.id && (
                          <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            আপনি
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                        {m.phone || m.user?.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold uppercase ${
                            m.role === "owner"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : m.role === "manager"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {m.role === "owner" ? "মালিক (Owner)" : m.role === "manager" ? "ম্যানেজার" : "সদস্য"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {m.seat_label || "নির্দিষ্ট নেই"}
                      </td>
                      {isManagerOrOwner && (
                        <td className="px-6 py-4 text-center">
                          {m.role !== "owner" && (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="member">সদস্য বানান</option>
                              <option value="manager">ম্যানেজার বানান</option>
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2-Column: Create New Mess & Join with Invite Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Create Mess */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" /> নতুন মেস তৈরি করুন
            </h2>
            <p className="text-xs text-slate-500">
              আপনি যদি মেস চালু বা পরিচালনা করতে চান, তবে এখানে মেসের নাম ও ঠিকানা দিন
            </p>

            <form onSubmit={handleCreateMess} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মেসের নাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ধানমন্ডি শান্তি নিবাস"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জেলা</label>
                  <input
                    type="text"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">থানা</label>
                  <input
                    type="text"
                    placeholder="যেমন: ধানমন্ডি"
                    value={newThana}
                    onChange={(e) => setNewThana(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">এলাকা / রোড নং</label>
                <input
                  type="text"
                  placeholder="যেমন: রোড নং ৪/এ, বাড়ি নং ১২"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {creating ? "তৈরি হচ্ছে..." : "নতুন মেস তৈরি করুন"}
              </button>
            </form>
          </div>

          {/* Card 2: Join with Code */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-600" /> ইনভাইট কোড দিয়ে মেসে যোগ দিন
            </h2>
            <p className="text-xs text-slate-500">
              আপনার মেস ম্যানেজার আপনাকে যে ৬ অক্ষরের কোড দিয়েছেন সেটি এখানে দিন
            </p>

            {joinMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{joinMsg}</span>
              </div>
            )}

            {joinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinMess} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ৬ অক্ষরের ইনভাইট কোড
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="যেমন: 28TQ2A"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-lg font-mono font-bold tracking-widest text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                />
              </div>

              <button
                type="submit"
                disabled={joining || inviteCode.length < 4}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {joining ? "যাচাই হচ্ছে..." : "মেসে যোগ দিন"}
              </button>
            </form>
          </div>
        </div>
      </main>
  );
}
