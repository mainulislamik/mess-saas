"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Table,
  ShoppingBag,
  Home,
  MessageCircle,
  Calendar,
  Printer,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Utensils,
  Receipt,
  Users,
  FileSpreadsheet,
  Download,
} from "lucide-react";

interface MasterSheetKPIs {
  total_meals: number;
  total_bazar: number;
  meal_rate: number;
  total_deposits: number;
  total_fixed_cost: number;
  fixed_cost_per_member: number;
  cash_in_hand: number;
  total_due: number;
  total_surplus: number;
}

interface MasterSheetMember {
  user_id: string;
  name: string;
  phone?: string;
  seat_label?: string;
  role: string;
  daily_meals: Record<number, number>;
  total_breakfast: number;
  total_lunch: number;
  total_dinner: number;
  total_guest: number;
  total_meals: number;
  meal_cost: number;
  fixed_cost_share: number;
  total_cost: number;
  total_deposit: number;
  balance: number;
  status: string;
}

interface MasterSheetDailyTotal {
  day: number;
  date: string;
  total_meals: number;
}

interface MasterSheetBazarItem {
  id: string;
  date: string;
  user_id?: string;
  user_name: string;
  items: string;
  amount: number;
}

interface MasterSheetFixedCostItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  split_type: string;
}

interface MasterSheetData {
  mess_id: string;
  mess_name: string;
  month: string;
  days_in_month: number;
  kpis: MasterSheetKPIs;
  members: MasterSheetMember[];
  daily_totals: MasterSheetDailyTotal[];
  bazars: MasterSheetBazarItem[];
  fixed_costs: MasterSheetFixedCostItem[];
}

export default function MasterSheetPage() {
  const router = useRouter();
  const { user, currentMess, isLoading } = useAuth();

  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<MasterSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"matrix" | "bazar" | "fixed" | "vouchers">("matrix");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMasterSheet = async (targetMonth = month) => {
    if (!currentMess) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/messes/${currentMess.id}/master-sheet?month=${targetMonth}`);
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load master sheet", err);
      setError(err.response?.data?.detail || "মাস্টার শিট লোড করতে ব্যর্থ হয়েছে");
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
      fetchMasterSheet(month);
    }
  }, [currentMess, month, user, isLoading]);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    setMonth(nextMonth);
  };

  const daysArray = useMemo(() => {
    const daysCount = data?.days_in_month || 31;
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [data?.days_in_month]);

  const getWhatsAppMessage = (mem: MasterSheetMember) => {
    if (!data) return "";
    const isRefund = mem.balance >= 0;
    const balanceText = isRefund
      ? `✅ মেস থেকে ফেরত পাবেন: ৳${mem.balance.toFixed(2)}`
      : `⚠️ মেসে বকেয়া পরিশোধ করতে হবে: ৳${Math.abs(mem.balance).toFixed(2)}`;

    return `*মেস মিল ও খরচ স্টেটমেন্ট (${data.month})*\n` +
      `মেস: ${data.mess_name}\n` +
      `সদস্য: ${mem.name} (${mem.seat_label || "সিট নির্ধারিত নেই"})\n` +
      `---------------------------------\n` +
      `• মোট মিল: ${mem.total_meals} টি\n` +
      `• মিল রেট: ৳${data.kpis.meal_rate.toFixed(2)} / মিল\n` +
      `• মোট খাবার খরচ: ৳${mem.meal_cost.toFixed(2)}\n` +
      `• বাসা ও ইউটিলিটি শেয়ার: ৳${mem.fixed_cost_share.toFixed(2)}\n` +
      `• মোট প্রদেয় খরচ: ৳${mem.total_cost.toFixed(2)}\n` +
      `• আপনার মোট জমা: ৳${mem.total_deposit.toFixed(2)}\n` +
      `---------------------------------\n` +
      `${balanceText}\n\n` +
      `_ব্যাচেলর মেস ম্যানেজার বিডি দ্বারা তৈরি_`;
  };

  const handleCopyWhatsApp = (mem: MasterSheetMember) => {
    const text = getWhatsAppMessage(mem);
    navigator.clipboard.writeText(text);
    setCopiedId(mem.user_id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (mem: MasterSheetMember) => {
    const text = encodeURIComponent(getWhatsAppMessage(mem));
    const phone = mem.phone ? mem.phone.replace(/[^0-9]/g, "") : "";
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    if (currentMess?.id) {
      window.open(`/dashboard/master-sheet/print?mess_id=${currentMess.id}&month=${month}`, "_blank");
    } else {
      window.print();
    }
  };

  const handleDownloadCSV = async () => {
    if (!currentMess?.id) return;
    try {
      const res = await api.get(`/messes/${currentMess.id}/master-sheet/export-csv?month=${month}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `master_sheet_${currentMess.name}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("CSV Download failed", err);
      alert("CSV এক্সপোর্ট করতে সমস্যা হয়েছে");
    }
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Table className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">স্মার্ট মেস মাস্টার শিট</h1>
              <p className="text-sm text-slate-500">
                {data ? `${data.mess_name} • সকল মিল, বাজার, বাসা ভাড়া ও ক্যাশ ড্রয়ার লাইভ হিসাব` : "লোড হচ্ছে..."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Controller */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
              title="পূর্ববর্তী মাস"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center px-2 gap-1.5 text-sm font-semibold text-slate-800">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span>{month}</span>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
              title="পরবর্তী মাস"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => fetchMasterSheet()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>রিফ্রেশ</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-semibold rounded-xl transition"
            title="এক্সেল বা গুগল শিটে খোলার জন্য CSV ডাউনলোড করুন"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>এক্সেল / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            title="A4 সাইজে সুন্দরভাবে প্রিন্ট বা PDF ডাউনলোড করুন"
          >
            <Printer className="h-4 w-4" />
            <span>প্রিন্ট / PDF</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 6 KPI Metric Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total Meals */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">মোট মিল</span>
              <Utensils className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              {data.kpis.total_meals.toFixed(1)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">সব বেলার মোট খাবার</div>
          </div>

          {/* 2. Total Bazar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">মোট বাজার</span>
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              ৳{data.kpis.total_bazar.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">চলতি মাসের মেস বাজার</div>
          </div>

          {/* 3. Live Meal Rate */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200 shadow-xs">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-xs font-semibold">লাইভ মিল রেট</span>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-xl font-extrabold text-indigo-950">
              ৳{data.kpis.meal_rate.toFixed(2)}
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-1">বাজার ÷ মোট মিল</div>
          </div>

          {/* 4. Total Deposits */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">মোট জমা ফান্ড</span>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              ৳{data.kpis.total_deposits.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">মেম্বারদের মোট জমা</div>
          </div>

          {/* 5. Cash in Hand (Drawer Balance) */}
          <div
            className={`p-4 rounded-xl border shadow-xs ${
              data.kpis.cash_in_hand >= 0
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                : "bg-rose-50/70 border-rose-200 text-rose-950"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">ক্যাশ ড্রয়ার (হাতে নগদ)</span>
              <Wallet className="h-4 w-4" />
            </div>
            <div className="text-xl font-extrabold">
              ৳{data.kpis.cash_in_hand.toLocaleString()}
            </div>
            <div className="text-[11px] opacity-80 mt-1">জমা − (বাজার + ফিক্সড)</div>
          </div>

          {/* 6. Total Due */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">মেস মোট বকেয়া</span>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600">
              ৳{data.kpis.total_due.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">সদস্যদের নিকট পাওনা</div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl print:hidden">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === "matrix"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Table className="h-4 w-4" />
          <span>খাবার মিল শিট (Matrix)</span>
        </button>

        <button
          onClick={() => setActiveTab("bazar")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === "bazar"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>বাজার খতিয়ান ({data?.bazars.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("fixed")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === "fixed"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>বাসা ভাড়া ও ইউটিলিটি ({data?.fixed_costs.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("vouchers")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === "vouchers"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>সদস্য ভাউচার ও হোয়াটসঅ্যাপ ({data?.members.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: Meal Matrix Table */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                দৈনিক খাবার মিল ও আর্থিক ব্যালেন্স ম্যাট্রিক্স
              </h2>
              <p className="text-xs text-slate-500">
                প্রতিদিনের মিল কাউন্ট এবং ডানে স্বয়ংক্রিয় খাবার খরচ, বাসা শেয়ার ও জমা-বকেয়া স্থিতি
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              মাস: {month} ({data?.days_in_month} দিন)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 min-w-[140px] shadow-xs">
                    সদস্যের নাম
                  </th>
                  {daysArray.map((d) => (
                    <th key={d} className="p-2 text-center min-w-[34px] border-r border-slate-200">
                      {d}
                    </th>
                  ))}
                  <th className="p-2.5 text-center bg-amber-50/80 text-amber-900 border-r border-slate-200 font-bold min-w-[70px]">
                    মোট মিল
                  </th>
                  <th className="p-2.5 text-right bg-slate-100 border-r border-slate-200 min-w-[85px]">
                    খাবার খরচ
                  </th>
                  <th className="p-2.5 text-right bg-slate-100 border-r border-slate-200 min-w-[85px]">
                    ইউটিলিটি+ভাড়া
                  </th>
                  <th className="p-2.5 text-right bg-slate-100 border-r border-slate-200 min-w-[85px]">
                    মোট খরচ
                  </th>
                  <th className="p-2.5 text-right bg-slate-100 border-r border-slate-200 min-w-[85px]">
                    মোট জমা
                  </th>
                  <th className="p-2.5 text-right bg-slate-100 border-r border-slate-200 min-w-[95px]">
                    ব্যালেন্স
                  </th>
                  <th className="p-2.5 text-center bg-slate-100 min-w-[85px]">
                    স্ট্যাটাস
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.members.map((mem) => {
                  const isRefund = mem.balance >= 0;
                  return (
                    <tr key={mem.user_id} className="hover:bg-slate-50/80 transition">
                      {/* Sticky Member Col */}
                      <td className="p-2.5 sticky left-0 z-10 bg-white border-r border-slate-200 font-medium text-slate-900 shadow-xs">
                        <div className="font-semibold text-slate-900 truncate max-w-[130px]">{mem.name}</div>
                        <div className="text-[10px] text-slate-400">{mem.seat_label || "সদস্য"}</div>
                      </td>

                      {/* 1..31 Days */}
                      {daysArray.map((d) => {
                        const val = mem.daily_meals[d] || 0;
                        return (
                          <td
                            key={d}
                            className={`p-1.5 text-center border-r border-slate-100 font-medium ${
                              val > 0
                                ? "text-slate-800 bg-emerald-50/30"
                                : "text-slate-300"
                            }`}
                          >
                            {val > 0 ? val : "—"}
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="p-2 text-center bg-amber-50/50 text-amber-950 font-bold border-r border-slate-200">
                        {mem.total_meals.toFixed(1)}
                      </td>
                      <td className="p-2 text-right border-r border-slate-100 font-medium text-slate-700">
                        ৳{mem.meal_cost.toFixed(0)}
                      </td>
                      <td className="p-2 text-right border-r border-slate-100 text-slate-600">
                        ৳{mem.fixed_cost_share.toFixed(0)}
                      </td>
                      <td className="p-2 text-right border-r border-slate-100 font-bold text-slate-900">
                        ৳{mem.total_cost.toFixed(0)}
                      </td>
                      <td className="p-2 text-right border-r border-slate-100 text-emerald-600 font-semibold">
                        ৳{mem.total_deposit.toFixed(0)}
                      </td>
                      <td
                        className={`p-2 text-right border-r border-slate-100 font-extrabold ${
                          isRefund ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isRefund ? `+৳${mem.balance.toFixed(0)}` : `-৳${Math.abs(mem.balance).toFixed(0)}`}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRefund
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {mem.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Bottom Daily Aggregates Footer */}
              <tfoot>
                <tr className="bg-slate-200/90 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="p-2.5 sticky left-0 z-20 bg-slate-200 border-r border-slate-300 text-slate-950 font-extrabold">
                    দৈনিক মোট মিল
                  </td>
                  {daysArray.map((d) => {
                    const dt = data?.daily_totals.find((item) => item.day === d);
                    const dayTotal = dt?.total_meals || 0;
                    return (
                      <td
                        key={d}
                        className={`p-1.5 text-center border-r border-slate-300 font-bold ${
                          dayTotal > 0 ? "text-indigo-950 bg-indigo-50/50" : "text-slate-400"
                        }`}
                      >
                        {dayTotal > 0 ? dayTotal : "0"}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-center bg-amber-200/90 text-amber-950 border-r border-slate-300 font-extrabold text-sm">
                    {data?.kpis.total_meals.toFixed(1)}
                  </td>
                  <td className="p-2 text-right border-r border-slate-300">
                    ৳{data?.kpis.total_bazar.toFixed(0)}
                  </td>
                  <td className="p-2 text-right border-r border-slate-300">
                    ৳{data?.kpis.total_fixed_cost.toFixed(0)}
                  </td>
                  <td className="p-2 text-right border-r border-slate-300">
                    ৳{((data?.kpis.total_bazar || 0) + (data?.kpis.total_fixed_cost || 0)).toFixed(0)}
                  </td>
                  <td className="p-2 text-right border-r border-slate-300 text-emerald-800">
                    ৳{data?.kpis.total_deposits.toFixed(0)}
                  </td>
                  <td className="p-2 text-right border-r border-slate-300 font-extrabold text-slate-900">
                    ৳{data?.kpis.cash_in_hand.toFixed(0)}
                  </td>
                  <td className="p-2 text-center text-slate-600 text-[10px]">
                    ক্যাশ ড্রয়ার
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Bazar Ledger */}
      {activeTab === "bazar" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">মাসিক বাজার খতিয়ান</h2>
              <p className="text-xs text-slate-500">
                তারিখ অনুযায়ী বাজারের হিসাব, বাজারকারীর নাম ও খরচের বিবরণ
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">মোট বাজার খরচ</span>
              <div className="text-lg font-bold text-emerald-600">
                ৳{data?.kpis.total_bazar.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">বাজারকারী</th>
                  <th className="p-3">বিবরণ / আইটেমসমূহ</th>
                  <th className="p-3 text-right">খরচ (টাকা)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.bazars.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      চলতি মাসে কোনো বাজারের রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  data?.bazars.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-medium text-slate-900">{b.date}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                          <Users className="h-3.5 w-3.5 text-indigo-500" />
                          {b.user_name}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{b.items}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        ৳{b.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-200">
                  <td colSpan={3} className="p-3 text-right text-slate-800">
                    সর্বমোট বাজার:
                  </td>
                  <td className="p-3 text-right text-emerald-700 font-extrabold text-base">
                    ৳{data?.kpis.total_bazar.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Rent & Utilities Breakdown */}
      {activeTab === "fixed" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">বাসা ভাড়া ও ইউটিলিটি খরচ তালিকা</h2>
              <p className="text-xs text-slate-500">
                বাসা ভাড়া, বিদ্যুৎ, গ্যাস, ওয়াইফাই এবং অন্যান্য নির্ধারিত খরচ
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">মাথাপিছু ফিক্সড শেয়ার</span>
              <div className="text-lg font-bold text-indigo-600">
                ৳{data?.kpis.fixed_cost_per_member.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.fixed_costs.map((fc) => (
              <div
                key={fc.id}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <div>
                  <div className="font-semibold text-slate-900">{fc.title}</div>
                  <div className="text-xs text-slate-500">
                    ক্যাটাগরি: {fc.category} • বণ্টন: {fc.split_type === "equal" ? "সমান ভাগে" : fc.split_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">৳{fc.amount.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">
                    জনপ্রতি: ৳{(fc.amount / (data?.members.length || 1)).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-indigo-950 font-bold">
            <span>সর্বমোট ফিক্সড ও বাসা ভাড়া:</span>
            <span className="text-lg text-indigo-700">৳{data?.kpis.total_fixed_cost.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* TAB 4: Member WhatsApp Vouchers */}
      {activeTab === "vouchers" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-5 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">সদস্য মেমো ও ১-ক্লিক হোয়াটসঅ্যাপ শেয়ার</h2>
            <p className="text-xs text-slate-500">
              প্রত্যেক মেম্বারের চলতি মাসের সম্পূর্ণ হিসাবের ডিজিটাল স্লিপ এবং এক ক্লিকে হোয়াটসঅ্যাপে পাঠানোর সুবিধা
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.members.map((mem) => {
              const isRefund = mem.balance >= 0;
              const isCopied = copiedId === mem.user_id;

              return (
                <div
                  key={mem.user_id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-base">{mem.name}</div>
                        <div className="text-xs text-slate-500">
                          {mem.seat_label || "সিট নির্ধারণ করা নেই"} {mem.phone ? `• ${mem.phone}` : ""}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isRefund ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {mem.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>মোট মিল:</span>
                        <span className="font-bold text-slate-900">{mem.total_meals.toFixed(1)} টি</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>খাবার খরচ (@৳{data.kpis.meal_rate.toFixed(2)}):</span>
                        <span className="font-semibold text-slate-800">৳{mem.meal_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>বাসা ও ইউটিলিটি শেয়ার:</span>
                        <span className="font-semibold text-slate-800">৳{mem.fixed_cost_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                        <span>মোট প্রদেয় খরচ:</span>
                        <span>৳{mem.total_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>আপনার জমা ফান্ড:</span>
                        <span>৳{mem.total_deposit.toFixed(2)}</span>
                      </div>
                      <div
                        className={`flex justify-between font-extrabold text-sm border-t border-slate-200 pt-1.5 ${
                          isRefund ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        <span>{isRefund ? "ফেরত পাবেন:" : "বকেয়া পরিশোধ:"}</span>
                        <span>৳{Math.abs(mem.balance).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => handleCopyWhatsApp(mem)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>মেমো কপি</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShareWhatsApp(mem)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>হোয়াটসঅ্যাপ</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
