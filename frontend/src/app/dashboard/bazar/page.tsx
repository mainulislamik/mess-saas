"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  ShoppingBag,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Receipt,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Check,
  X,
  Users,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from "lucide-react";

interface PriceTrend {
  item_name: string;
  frequency: number;
  last_price: number;
  avg_price: number;
  price_change: "stable" | "up" | "down";
}

export default function BazarPage() {
  const router = useRouter();
  const { user, currentMess, isLoading } = useAuth();

  const [month, setMonth] = useState("");
  const [bazars, setBazars] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
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

  // Quick NLP State
  const [entryMode, setEntryMode] = useState<"standard" | "smart">("smart");
  const [quickText, setQuickText] = useState("");
  const [parsedItems, setParsedItems] = useState<{ item: string; amount: number }[]>([]);
  const [parsedTotal, setParsedTotal] = useState(0);
  const [parsingNLP, setParsingNLP] = useState(false);

  // Price trends
  const [priceTrends, setPriceTrends] = useState<PriceTrend[]>([]);

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  const fetchBazars = async () => {
    if (!currentMess) return;
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const res = await api.get(`/messes/${currentMess.id}/bazars?month=${targetMonth}`);
      setBazars(res.data.bazars || res.data.items || []);
      setTotalAmount(res.data.total_bazar_amount ?? res.data.total_bazar ?? 0);
      setPendingCount(res.data.pending_count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    if (!currentMess) return;
    try {
      const res = await api.get(`/messes/${currentMess.id}/members`);
      setMembers(res.data || []);
      if (!isManagerOrOwner && user?.id) {
        setShopperId(user.id);
      } else if (res.data?.length > 0 && !shopperId) {
        setShopperId(user?.id || res.data[0].user_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPriceTrends = async () => {
    if (!currentMess) return;
    try {
      const res = await api.get(`/messes/${currentMess.id}/bazars/price-trends`);
      setPriceTrends(res.data || []);
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
      Promise.all([fetchBazars(), fetchMembers(), fetchPriceTrends()]).finally(() => setLoading(false));
    }
  }, [user, currentMess, isLoading, month, router]);

  const handleQuickParse = async () => {
    if (!currentMess || !quickText.trim()) return;
    setParsingNLP(true);
    setError(null);
    try {
      const res = await api.post(`/messes/${currentMess.id}/bazars/parse-quick`, {
        text: quickText,
      });
      setParsedItems(res.data.items || []);
      setParsedTotal(res.data.total_amount || 0);
      setAmount(String(res.data.total_amount || ""));
      setItems(res.data.formatted_description || "");
    } catch (err: any) {
      setError(err.response?.data?.detail || "বাজারের টেক্সট পার্স করতে সমস্যা হয়েছে");
    } finally {
      setParsingNLP(false);
    }
  };

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

  const handleReviewBazar = async (bazarId: string, action: "approve" | "reject") => {
    if (!currentMess) return;
    const confirmMsg =
      action === "approve"
        ? "আপনি কি এই বাজার খরচটি অনুমোদন করতে চান? অনুমোদনের পর এটি মিল রেট ও মোট বাজারে যোগ হবে।"
        : "আপনি কি এই বাজার খরচটি বাতিল/প্রত্যাখ্যান করতে চান?";
    if (!confirm(confirmMsg)) return;

    let reason: string | undefined;
    if (action === "reject") {
      const inputReason = prompt("বাতিল করার কারণ লিখুন (ঐচ্ছিক):");
      if (inputReason === null) return;
      reason = inputReason.trim() || "ম্যানেজার কর্তৃক প্রত্যাখ্যাত";
    }

    try {
      await api.patch(`/messes/${currentMess.id}/bazars/${bazarId}/review`, {
        action,
        rejection_reason: reason,
      });
      fetchBazars();
    } catch (err: any) {
      alert(err.response?.data?.detail || "অ্যাকশন সম্পন্ন করা যায়নি");
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
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              {month} মাসের মোট বাজার (অনুমোদিত)
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold mt-1">
              ৳{totalAmount.toLocaleString("bn-BD")}
            </div>
            {pendingCount > 0 && (
              <span className="inline-block mt-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-xl">
                ⏳ {pendingCount} টি বাজার এন্ট্রি অনুমোদনের অপেক্ষায়
              </span>
            )}
          </div>
          <div className="text-xs text-slate-300 max-w-xs sm:text-right">
            ভুয়া এন্ট্রি ঠেকাতে শুধুমাত্র ম্যানেজারের অনুমোদিত বাজার খরচই মেসের লাইভ মিল রেট ও মোট বাজারে যোগ হয়।
          </div>
        </div>

        {/* Pending Review Alert Banner for Managers */}
        {isManagerOrOwner && pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {pendingCount} টি মেম্বার বাজার এন্ট্রি আপনার অনুমোদনের অপেক্ষায় আছে
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  নিচের তালিকায় অপেক্ষমাণ বাজারগুলো যাচাই করে "অনুমোদন" বা "বাতিল" করুন।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Smart Price Trend Radar */}
        {priceTrends.length > 0 && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  নিত্যপ্রয়োজনীয় মেস বাজারদর রাডার ও ট্রেন্ড
                </h3>
              </div>
              <span className="text-xs text-slate-400">সাম্প্রতিক বাজার খতিয়ান ভিত্তিক</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {priceTrends.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                >
                  <div className="text-xs font-semibold text-slate-600 truncate">{pt.item_name}</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    ৳{pt.last_price.toLocaleString("bn-BD")}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-400">গড়: ৳{Math.round(pt.avg_price)}</span>
                    {pt.price_change === "up" && (
                      <span className="inline-flex items-center text-rose-600 font-bold">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> উর্ধ্বমুখী
                      </span>
                    )}
                    {pt.price_change === "down" && (
                      <span className="inline-flex items-center text-emerald-600 font-bold">
                        <TrendingDown className="w-3 h-3 mr-0.5" /> নিম্নমুখী
                      </span>
                    )}
                    {pt.price_change === "stable" && (
                      <span className="inline-flex items-center text-slate-500 font-medium">
                        <Minus className="w-3 h-3 mr-0.5" /> স্থিতিশীল
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <th className="px-6 py-4 text-center">স্ট্যাটাস</th>
                  <th className="px-6 py-4 text-center">অ্যাকশন</th>
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
                        {b.rejection_reason && (
                          <div className="text-xs text-rose-500 font-medium mt-0.5">
                            বাতিলের কারণ: {b.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-base">
                        ৳{b.amount.toLocaleString("bn-BD")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {b.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> অনুমোদিত
                          </span>
                        ) : b.status === "pending" ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"
                            title="ম্যানেজারের অনুমোদনের অপেক্ষায়"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> অপেক্ষমাণ
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200"
                            title={b.rejection_reason || "বাতিলকৃত"}
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> বাতিল
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isManagerOrOwner && b.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleReviewBazar(b.id, "approve")}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="অনুমোদন করুন"
                              >
                                <Check className="w-3.5 h-3.5" /> অনুমোদন
                              </button>
                              <button
                                onClick={() => handleReviewBazar(b.id, "reject")}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="বাতিল করুন"
                              >
                                <X className="w-3.5 h-3.5" /> বাতিল
                              </button>
                            </>
                          )}
                          {(isManagerOrOwner || b.user_id === user?.id) && (
                            <button
                              onClick={() => handleDeleteBazar(b.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
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
              <p className="text-xs text-slate-500 mb-4">
                বাজারের জিনিসপত্র ও খরচের পরিমাণ সঠিকভাবে লিখুন
              </p>

              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                <button
                  type="button"
                  onClick={() => setEntryMode("smart")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    entryMode === "smart"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  স্মার্ট কুইক এন্ট্রি (লিখুন)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("standard")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    entryMode === "standard"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  সাধারণ ফর্ম
                </button>
              </div>

              {/* Smart Quick Entry Box */}
              {entryMode === "smart" && (
                <div className="mb-4 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" /> এক লাইনে লিখুন:
                    </span>
                    <span className="text-[11px] text-emerald-700">নাম ও দাম একসাথে</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="যেমন: আলু ৮০, ডিম ১৪০, সয়াবিন তেল ২২০, মুরগি ৩৫০"
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleQuickParse}
                      disabled={parsingNLP || !quickText.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {parsingNLP ? "হিসাব হচ্ছে..." : "স্বয়ংক্রিয় হিসাব করুন"}
                    </button>
                    {parsedTotal > 0 && (
                      <span className="text-xs font-extrabold text-emerald-900">
                        মোট: ৳{parsedTotal.toLocaleString("bn-BD")}
                      </span>
                    )}
                  </div>

                  {parsedItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-emerald-200/60">
                      {parsedItems.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white text-emerald-800 text-[11px] font-semibold rounded-md border border-emerald-300 shadow-2xs"
                        >
                          {it.item}: ৳{it.amount}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddBazar} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      বাজার কে করেছেন?
                    </label>
                    {!isManagerOrOwner && (
                      <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        সদস্য (শুধুমাত্র নিজের বাজার)
                      </span>
                    )}
                  </div>
                  <select
                    value={isManagerOrOwner ? shopperId : user?.id || shopperId}
                    onChange={(e) => isManagerOrOwner && setShopperId(e.target.value)}
                    disabled={!isManagerOrOwner}
                    required
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold ${
                      !isManagerOrOwner
                        ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                        : "bg-slate-50 text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    }`}
                  >
                    {isManagerOrOwner ? (
                      members.map((m) => {
                        const name = m.user_name || m.user?.name || "সদস্য";
                        const roleLabel =
                          m.role === "owner" || m.role === "manager"
                            ? "মেস ম্যানেজার"
                            : "মেস সদস্য";
                        const isMe = m.user_id === user?.id;
                        return (
                          <option key={m.user_id || m.id} value={m.user_id}>
                            {name} {isMe ? "(আপনি)" : ""} — {roleLabel}
                          </option>
                        );
                      })
                    ) : (
                      <option value={user?.id}>
                        {user?.name || "আপনি"} (শুধুমাত্র নিজের বাজার)
                      </option>
                    )}
                  </select>
                  {!isManagerOrOwner && (
                    <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ভুয়া এন্ট্রি রোধে সাধারণ সদস্যের এন্ট্রি স্বয়ংক্রিয়ভাবে অপেক্ষমাণ (Pending) থাকবে। ম্যানেজার অনুমোদন করার পর তা মিল রেটে যুক্ত হবে।
                    </p>
                  )}
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
  );
}
