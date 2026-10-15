"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Users2,
  Flame,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  ShieldAlert,
} from "lucide-react";

export default function MaidGasPage() {
  const { currentMess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Modals
  const [showAttModal, setShowAttModal] = useState(false);
  const [attDate, setAttDate] = useState("");
  const [attName, setAttName] = useState("খালা / বুয়া");
  const [isPresent, setIsPresent] = useState(true);
  const [dailyWage, setDailyWage] = useState("100");
  const [attNotes, setAttNotes] = useState("");

  const [showGasModal, setShowGasModal] = useState(false);
  const [gasName, setGasName] = useState("এলপি গ্যাস সিলিন্ডার (১২ কেজি)");
  const [installDate, setInstallDate] = useState("");
  const [expectedDays, setExpectedDays] = useState("25");
  const [gasCost, setGasCost] = useState("1450");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  const fetchData = async () => {
    if (!currentMess) return;
    try {
      setLoading(true);
      const res = await api.get(`/messes/${currentMess.id}/maid-gas`);
      setDashboardData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentMess) {
      fetchData();
      const today = new Date().toISOString().split("T")[0];
      setAttDate(today);
      setInstallDate(today);
    }
  }, [currentMess]);

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/messes/${currentMess.id}/maid-gas/attendance`, {
        date: attDate,
        maid_name: attName,
        is_present: isPresent,
        daily_wage: parseFloat(dailyWage),
        notes: attNotes || null,
      });
      setShowAttModal(false);
      setAttNotes("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "হাজিরা সংরক্ষণ করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddGas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/messes/${currentMess.id}/maid-gas/gas`, {
        cylinder_name: gasName,
        installed_date: installDate,
        expected_days: parseInt(expectedDays),
        cost: parseFloat(gasCost),
      });
      setShowGasModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "গ্যাস লগ সংরক্ষণ করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentMess) return null;

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="w-6 h-6 text-emerald-600" /> বুয়া/খালা হাজিরা ও গ্যাস সিলিন্ডার প্রেডিকশন
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            মেসের দৈনিক কাজের বুয়ার হাজিরা, মজুরি এবং গ্যাস সিলিন্ডারের মেয়াদ ও পূর্বাভাসের হিসাব
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAttModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> বুয়া হাজিরা এন্ট্রি
            </button>
            <button
              onClick={() => setShowGasModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer"
            >
              <Flame className="w-4 h-4" /> নতুন গ্যাস সিলিন্ডার
            </button>
          </div>
        )}
      </div>

      {/* Gas Cylinder Forecast Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500" /> গ্যাস সিলিন্ডার স্ট্যাটাস ও প্রেডিকশন ইঞ্জিন
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {dashboardData?.gas_logs?.map((gas: any) => (
            <div
              key={gas.id}
              className={`bg-white rounded-3xl p-6 border shadow-xs space-y-4 relative overflow-hidden ${
                gas.status === "exhausted"
                  ? "border-rose-300 bg-rose-50/20"
                  : gas.status === "warning"
                  ? "border-amber-300 bg-amber-50/20"
                  : "border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                  {gas.is_active ? "🟢 রানিং সিলিন্ডার" : "🔴 সমাপ্ত"}
                </span>
                <span className="text-xs font-bold text-slate-500">৳{gas.cost}</span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">{gas.cylinder_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">সংস্থাপনের তারিখ: {gas.installed_date}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">ব্যবহৃত: {gas.days_elapsed} দিন</span>
                  <span
                    className={
                      gas.status === "exhausted"
                        ? "text-rose-600 font-bold"
                        : gas.status === "warning"
                        ? "text-amber-600 font-bold"
                        : "text-emerald-600 font-bold"
                    }
                  >
                    বাকি প্রায় {gas.days_remaining} দিন
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      gas.status === "exhausted"
                        ? "bg-rose-500"
                        : gas.status === "warning"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${gas.percentage_used}%` }}
                  ></div>
                </div>
              </div>

              {gas.status === "exhausted" && (
                <div className="p-3 bg-rose-100 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>সতর্কতা: গ্যাস শেষ হওয়ার পথে! অবিলম্বে নতুন সিলিন্ডার অর্ডার করুন।</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Maid Attendance Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">বুয়া/খালা দৈনিক হাজিরা ও মজুরি খতিয়ান</h2>
          </div>
          <span className="text-xs text-slate-400">সর্বশেষ ৩০ দিনের রেকর্ড</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-6">তারিখ</th>
                <th className="py-3 px-6">নাম</th>
                <th className="py-3 px-6">হাজিরা স্ট্যাটাস</th>
                <th className="py-3 px-6">দৈনিক মজুরি</th>
                <th className="py-3 px-6">নোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {dashboardData?.attendances?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    কোনো হাজিরা রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                dashboardData?.attendances?.map((att: any) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{att.date}</td>
                    <td className="py-3.5 px-6">{att.maid_name}</td>
                    <td className="py-3.5 px-6">
                      {att.is_present ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> উপস্থিত
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> অনুপস্থিত / ছুটি
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">৳{att.daily_wage}</td>
                    <td className="py-3.5 px-6 text-slate-500">{att.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maid Attendance Modal */}
      {showAttModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <h2 className="text-xl font-bold text-slate-900">বুয়া/খালা হাজিরা এন্ট্রি</h2>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নাম</label>
                <input
                  type="text"
                  value={attName}
                  onChange={(e) => setAttName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিতি</label>
                <select
                  value={isPresent ? "true" : "false"}
                  onChange={(e) => setIsPresent(e.target.value === "true")}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="true">উপস্থিত (Present)</option>
                  <option value="false">অনুপস্থিত / ছুটি (Absent)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">দৈনিক মজুরি (৳)</label>
                <input
                  type="number"
                  value={dailyWage}
                  onChange={(e) => setDailyWage(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: অতিরিক্ত কাজের জন্য ৫০ টাকা বকশিশ"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAttModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "হাজিরা সংরক্ষণ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gas Cylinder Modal */}
      {showGasModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <h2 className="text-xl font-bold text-slate-900">নতুন গ্যাস সিলিন্ডার এন্ট্রি</h2>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddGas} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সিলিন্ডারের নাম / ব্র্যান্ড</label>
                <input
                  type="text"
                  value={gasName}
                  onChange={(e) => setGasName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সংস্থাপনের তারিখ (Install Date)</label>
                <input
                  type="date"
                  value={installDate}
                  onChange={(e) => setInstallDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গড় কত দিন যাওয়ার কথা?</label>
                <input
                  type="number"
                  value={expectedDays}
                  onChange={(e) => setExpectedDays(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ক্রয়মূল্য (৳)</label>
                <input
                  type="number"
                  value={gasCost}
                  onChange={(e) => setGasCost(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGasModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow transition disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "সিলিন্ডার লগ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
