"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";
import {
  ShoppingBag,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Receipt,
  CheckCircle,
  Users,
} from "lucide-react";

export default function BazarPage() {
  const router = useRouter();
  const { user, currentMess, isLoading } = useAuth();

  const [month, setMonth] = useState("");
  const [bazars, setBazars] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [shopperId, setShopperId] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const today = new Date().toISOString();
    setMonth(today.slice(0, 7));
    setDate(today.split("T")[0]);
  }, []);
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  const fetchBazars = async () => {
    if (!currentMess) return;
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const res = await api.get(`/messes/${currentMess.id}/bazars?month=${targetMonth}`);
      setBazars(res.data.bazars || res.data.items || []);
      setTotalAmount(res.data.total_bazar_amount ?? res.data.total_bazar ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    if (!currentMess) return;
    try {
      const res = await api.get(`/messes/${currentMess.id}/members`);
      setMembers(res.data || []);
      if (res.data?.length > 0 && !shopperId) {
        setShopperId(user?.id || res.data[0].user_id);
      }
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
      Promise.all([fetchBazars(), fetchMembers()]).finally(() => setLoading(false));
    }
  }, [user, currentMess, isLoading, month, router]);

  const handleAddBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess) return;
    setError(null);
    setSubmitting(true);

    try {
      await api.post(`/messes/${currentMess.id}/bazars`, {
        user_id: shopperId || user?.id,
        date,
        amount: parseFloat(amount),
        items,
        notes: notes || null,
      });

      setShowAddModal(false);
      setAmount("");
      setItems("");
      setNotes("");
      fetchBazars();
    } catch (err: any) {
      setError(err.response?.data?.detail || "বাজার যোগ করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBazar = async (bazarId: string) => {
    if (!currentMess || !confirm("আপনি কি নিশ্চিত এই বাজার খরচটি মুছে ফেলতে চান?")) return;
    try {
      await api.delete(`/messes/${currentMess.id}/bazars/${bazarId}`);
      fetchBazars();
    } catch (err: any) {
      alert(err.response?.data?.detail || "মুছে ফেলা যায়নি");
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
              <ShoppingBag className="w-6 h-6 text-emerald-600" /> বাজার খরচের হিসাব
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              প্রতিদিনের কাঁচাবাজার, চাল, ডাল, তেল ও অন্যান্য মেস খরচের তালিকা
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> বাজার এন্ট্রি করুন
            </button>
          </div>
        </div>

        {/* Total Stat Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {month} মাসের মোট বাজার
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold mt-1">
              ৳{totalAmount.toLocaleString("bn-BD")}
            </div>
          </div>
          <div className="text-xs text-slate-300">
            বাজারের প্রতিটি টাকার হিসাব মেসের লাইভ মিল রেটে প্রভাব ফেলবে।
          </div>
        </div>

        {/* Bazars Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              বাজার খরচের বিস্তারিত তালিকা ({bazars.length} টি এন্ট্রি)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">তারিখ</th>
                  <th className="px-6 py-4">বাজারকারী (মেম্বার)</th>
                  <th className="px-6 py-4">বাজারের বিবরণ</th>
                  <th className="px-6 py-4 text-right">খরচ (৳)</th>
                  {isManagerOrOwner && <th className="px-6 py-4 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bazars.length > 0 ? (
                  bazars.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-800 text-xs">
                        {b.date}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {b.user_name}
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <div className="text-slate-800 font-medium">{b.items}</div>
                        {b.notes && (
                          <div className="text-xs text-slate-400 mt-0.5">{b.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-base">
                        ৳{b.amount.toLocaleString("bn-BD")}
                      </td>
                      {isManagerOrOwner && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteBazar(b.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isManagerOrOwner ? 5 : 4}
                      className="px-6 py-12 text-center text-slate-400 text-sm"
                    >
                      এই মাসে কোনো বাজারের খরচ এন্ট্রি করা হয়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Bazar Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-1">নতুন বাজার যোগ করুন</h2>
              <p className="text-xs text-slate-500 mb-6">
                বাজারের জিনিসপত্র ও খরচের পরিমাণ সঠিকভাবে লিখুন
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddBazar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বাজার কে করেছেন?
                  </label>
                  <select
                    value={shopperId}
                    onChange={(e) => setShopperId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_name} ({m.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      বাজারের তারিখ
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      খরচের পরিমাণ (৳)
                    </label>
                    <input
                      type="number"
                      placeholder="যেমন: ১৫০০"
                      step="any"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বাজারের বিবরণ (জিনিসপত্রের নাম)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="যেমন: মিনিকেট চাল ৫ কেজি, সয়াবিন তেল ২ লিটার, ব্রয়লার মুরগি ২ কেজি, আলু, কাঁচামরিচ"
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    অতিরিক্ত নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: কারওয়ান বাজার থেকে কেনা"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "যুক্ত হচ্ছে..." : "বাজার সংরক্ষণ করুন"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
