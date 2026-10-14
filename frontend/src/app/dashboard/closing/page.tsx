"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";
import {
  FileCheck2,
  Calendar,
  Lock,
  Download,
  AlertCircle,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function ClosingPage() {
  const router = useRouter();
  const { user, currentMess, isLoading } = useAuth();

  const [month, setMonth] = useState("");
  const [closingData, setClosingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);

  const fetchClosing = async () => {
    if (!currentMess) return;
    setLoading(true);
    setError(null);
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const res = await api.get(`/messes/${currentMess.id}/closings/${targetMonth}`);
      setClosingData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "হিসাব লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (currentMess) {
      fetchClosing();
    }
  }, [user, currentMess, isLoading, month, router]);

  const handleFinalize = async () => {
    if (
      !confirm(
        `সতর্কতা: ${month} মাসের হিসাব ক্লোজ (লক) করলে এই মাসের মিল ও খরচের তথ্য আর পরিবর্তন করা যাবে না। আপনি কি নিশ্চিত?`
      )
    ) {
      return;
    }

    setFinalizing(true);
    try {
      if (!currentMess) return;
      await api.post(`/messes/${currentMess.id}/closings/${month}/finalize`, {
        notes: "মাসিক হিসাব সমাপনী সম্পন্ন হয়েছে।",
      });
      alert("অভিনন্দন! মাস সমাপনী সফলভাবে লক করা হয়েছে।");
      fetchClosing();
    } catch (err: any) {
      alert(err.response?.data?.detail || "ক্লোজ করতে ব্যর্থ হয়েছে");
    } finally {
      setFinalizing(false);
    }
  };

  if (!currentMess) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-emerald-600" /> মাস সমাপনী ও ফাইনাল হিসাব
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              মাসের সমস্ত মিল, বাজার খরচ ও ফিক্সড বিল মিলিয়ে স্বয়ংক্রিয় ব্যালেন্স শিট
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            {isManagerOrOwner && closingData && !closingData.is_closed && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {finalizing ? "লক হচ্ছে..." : "মাস সমাপনী লক করুন"}
              </button>
            )}
            {closingData?.is_closed && (
              <div className="px-3.5 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-200">
                <Lock className="w-3.5 h-3.5 text-rose-600" /> এই মাস লক করা হয়েছে
              </div>
            )}
          </div>
        </div>

        {/* Calculation Logic Formula Banner */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            হিসাবের গাণিতিক সূত্র (Calculation Formula)
          </h2>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 font-mono text-xs sm:text-sm text-slate-800 space-y-1.5">
            <div>
              <span className="text-emerald-700 font-bold">মিল রেট =</span> মোট বাজার খরচ (৳{closingData?.total_bazar?.toFixed(2) || "0.00"}) ÷ মোট মিল ({closingData?.total_meals?.toFixed(2) || "0.00"}) ={" "}
              <span className="text-emerald-700 font-extrabold">৳{closingData?.meal_rate?.toFixed(2) || "0.00"}</span>
            </div>
            <div>
              <span className="text-blue-700 font-bold">ফিক্সড খরচ শেয়ার =</span> মোট ফিক্সড বিল (৳{closingData?.total_fixed_cost?.toFixed(2) || "0.00"}) ÷ মোট সক্রিয় মেম্বার ({closingData?.member_summaries?.length || 1}) ={" "}
              <span className="text-blue-700 font-extrabold">
                ৳{((closingData?.total_fixed_cost || 0) / (closingData?.member_summaries?.length || 1)).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-purple-700 font-bold">মেম্বার ব্যালেন্স =</span> মেম্বারের জমা - (মেম্বারের মিল খরচ + ফিক্সড খরচ)
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ফাইনাল মিল রেট
            </span>
            <div className="text-3xl font-extrabold text-emerald-700 mt-2">
              ৳{closingData?.meal_rate?.toFixed(2) || "0.00"}
            </div>
            <div className="text-xs text-slate-400 mt-1">প্রতি মিলের আসল খরচ</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              মোট বাজার খরচ
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              ৳{closingData?.total_bazar?.toLocaleString("bn-BD") || "০"}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              মোট মিল খাওয়া হয়েছে: {closingData?.total_meals || 0} টি
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              মোট ফিক্সড বিল
            </span>
            <div className="text-3xl font-extrabold text-blue-700 mt-2">
              ৳{closingData?.total_fixed_cost?.toLocaleString("bn-BD") || "০"}
            </div>
            <div className="text-xs text-slate-400 mt-1">বাড়িভাড়া, গ্যাস, ওয়াইফাই ইত্যাদি</div>
          </div>
        </div>

        {/* Closing Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              মেম্বারদের ফাইনাল দেনা-পাওনা তালিকা ({month})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">মেম্বার</th>
                  <th className="px-4 py-4 text-center">মোট মিল</th>
                  <th className="px-4 py-4 text-right">মিল খরচ (৳)</th>
                  <th className="px-4 py-4 text-right">ফিক্সড খরচ (৳)</th>
                  <th className="px-4 py-4 text-right">মোট খরচ (৳)</th>
                  <th className="px-4 py-4 text-right">মোট জমা (৳)</th>
                  <th className="px-6 py-4 text-right">ফাইনাল ব্যালেন্স (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closingData?.member_summaries?.map((m: any) => {
                  const isRefund = m.balance >= 0;
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
                        <div className="text-[11px] font-normal text-slate-400">
                          {m.phone}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800">
                        {m.total_meals} টি
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        ৳{m.meal_cost?.toLocaleString("bn-BD")}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        ৳{m.fixed_cost_share?.toLocaleString("bn-BD")}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        ৳{m.total_cost?.toLocaleString("bn-BD")}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-700">
                        ৳{m.total_deposit?.toLocaleString("bn-BD")}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-base">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold ${
                            isRefund
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          ৳{Math.abs(m.balance).toLocaleString("bn-BD")}
                          <span className="ml-1 text-[11px]">
                            {isRefund ? "(ফেরত পাবে)" : "(বাকি আছে)"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
