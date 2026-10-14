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
} from "lucide-react";

export default function MealsPage() {
  const router = useRouter();
  const { user, currentMess, isLoading } = useAuth();

  const [date, setDate] = useState("");
  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

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
    if (currentMess) {
      setLoading(true);
      Promise.all([fetchDaily(), fetchMonthly()]).finally(() => setLoading(false));
    }
  }, [user, currentMess, isLoading, date, router]);

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
    setSaving(true);
    setMessage(null);
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
      setMessage("আজকের মিল সফলভাবে সংরক্ষিত হয়েছে!");
      fetchMonthly();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDateChange = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  if (!currentMess) return null;

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header with Date Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Utensils className="w-6 h-6 text-emerald-600" /> প্রতিদিনের মিল কাউন্ট
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              সদস্যদের সকালের নাস্তা (০.৫), দুপুর (১) ও রাতের (১) মিল এন্ট্রি করুন
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

        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Daily Table Card */}
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

            {isManagerOrOwner && (
              <button
                onClick={handleSaveBatch}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "সংরক্ষণ হচ্ছে..." : "সব মিল সংরক্ষণ করুন"}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
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
                {dailyData?.members?.map((m: any) => {
                  const canEdit = isManagerOrOwner || m.user_id === user?.id;
                  return (
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
                          disabled={!canEdit || m.is_off}
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
                          disabled={!canEdit || m.is_off}
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
                          disabled={!canEdit || m.is_off}
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
                          disabled={!canEdit}
                          checked={m.is_off}
                          onChange={(e) =>
                            handleMealChange(m.user_id, "is_off", e.target.checked)
                          }
                          className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                        />
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-base">
                        {m.total_meals}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Summary Card */}
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
      </main>
  );
}
