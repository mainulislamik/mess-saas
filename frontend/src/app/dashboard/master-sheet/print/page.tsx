"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Printer, ArrowLeft, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";

function MasterSheetPrintContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentMessId, setCurrentMessId] = useState<string>("");

  const currentMonth = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  useEffect(() => {
    async function loadData() {
      try {
        const messId = searchParams.get("mess_id") || localStorage.getItem("current_mess_id");
        if (!messId) {
          const mRes = await api.get("/messes");
          if (mRes.data && mRes.data.length > 0) {
            const mId = mRes.data[0].id;
            setCurrentMessId(mId);
            const res = await api.get(`/messes/${mId}/master-sheet?month=${currentMonth}`);
            setData(res.data);
          }
        } else {
          setCurrentMessId(messId);
          const res = await api.get(`/messes/${messId}/master-sheet?month=${currentMonth}`);
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load print sheet data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentMonth, searchParams]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-3"></div>
        <p className="font-semibold text-sm">মেস মাস্টার অডিট শিট প্রস্তুত করা হচ্ছে...</p>
      </div>
    );
  }

  const { kpis, members, daily_totals, days_in_month, bazars, fixed_costs } = data;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans print:bg-white print:p-0">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/master-sheet"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center gap-1.5 text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" /> ফিরে যান
            </Link>
            <div>
              <h1 className="font-extrabold text-sm">{data.mess_name} — অফিসিয়াল প্রিন্ট প্রিভিউ</h1>
              <p className="text-slate-400 text-xs">মাস: {data.month} • A4 Landscape প্রিন্টের জন্য অপ্টিমাইজড</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-lg shadow inline-flex items-center gap-2 cursor-pointer transition"
            >
              <Printer className="w-4 h-4" /> প্রিন্ট / সেভ PDF (Ctrl+P)
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="max-w-[1100px] mx-auto my-6 p-8 bg-white shadow-xl rounded-xl print:shadow-none print:m-0 print:p-4 print:max-w-none print:w-full border border-slate-300 print:border-none">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
          <div>
            <div className="inline-block bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-sm mb-1.5">
              অফিসিয়াল মেস অডিট বিবরণী • নোটিশ বোর্ড কপি
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">{data.mess_name}</h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              হিসাবের মাস: <strong className="text-slate-900 font-bold">{data.month}</strong> • মোট দিন:{" "}
              {days_in_month} দিন • প্রিন্ট তৈরির তারিখ: {new Date().toLocaleDateString("bn-BD")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-500 font-mono">MESS ID: {data.mess_id?.slice(0, 8)}</div>
            <div className="text-xs font-extrabold text-emerald-800 mt-1 inline-flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> অটোমেটেড ডিজিটাল অডিট ভেরিফাইড
            </div>
          </div>
        </div>

        {/* 6 Core KPI Summary Cards */}
        <div className="grid grid-cols-6 gap-2.5 mb-6 text-center text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md">
            <div className="text-[10px] text-slate-500 font-bold">মোট মিল</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{kpis.total_meals}</div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md">
            <div className="text-[10px] text-slate-500 font-bold">মোট বাজার খরচ</div>
            <div className="text-base font-black text-slate-900 mt-0.5">৳{kpis.total_bazar.toLocaleString()}</div>
          </div>
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-md">
            <div className="text-[10px] text-emerald-800 font-bold">চূড়ান্ত মিল রেট</div>
            <div className="text-base font-black text-emerald-900 mt-0.5">৳{kpis.meal_rate.toFixed(2)}</div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md">
            <div className="text-[10px] text-slate-500 font-bold">মোট ইউটিলিটি/স্থায়ী</div>
            <div className="text-base font-black text-slate-900 mt-0.5">৳{kpis.total_fixed_cost.toLocaleString()}</div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md">
            <div className="text-[10px] text-slate-500 font-bold">মাথাপিছু ফিক্সড খরচ</div>
            <div className="text-base font-black text-slate-900 mt-0.5">৳{kpis.fixed_cost_per_member.toFixed(0)}</div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md">
            <div className="text-[10px] text-slate-500 font-bold">মোট মেম্বার জমা</div>
            <div className="text-base font-black text-slate-900 mt-0.5">৳{kpis.total_deposits.toLocaleString()}</div>
          </div>
        </div>

        {/* Section 1: Member Financial Statement Table */}
        <div className="mb-6">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2 border-l-4 border-slate-900 pl-2">
            ১. সদস্যভিত্তিক ফাইনাল হিসাব ও সমাপনী ব্যালেন্স
          </h2>
          <div className="overflow-x-auto border border-slate-300 rounded-md">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-300">
                  <th className="p-1.5 text-center w-8 border-r border-slate-300">ক্র.</th>
                  <th className="p-1.5 border-r border-slate-300">সদস্যের নাম</th>
                  <th className="p-1.5 border-r border-slate-300">মোবাইল</th>
                  <th className="p-1.5 text-center border-r border-slate-300">মোট মিল</th>
                  <th className="p-1.5 text-right border-r border-slate-300">মিল খরচ</th>
                  <th className="p-1.5 text-right border-r border-slate-300">ফিক্সড শেয়ার</th>
                  <th className="p-1.5 text-right border-r border-slate-300 font-black">মোট খরচ</th>
                  <th className="p-1.5 text-right border-r border-slate-300 text-emerald-800">মোট জমা</th>
                  <th className="p-1.5 text-right border-r border-slate-300 font-black">সমাপনী ব্যালেন্স</th>
                  <th className="p-1.5 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {members.map((m: any, idx: number) => {
                  const isRefund = m.balance > 0;
                  const isDue = m.balance < 0;
                  return (
                    <tr key={m.user_id} className={idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}>
                      <td className="p-1.5 text-center font-bold text-slate-600 border-r border-slate-200">{idx + 1}</td>
                      <td className="p-1.5 font-bold text-slate-900 border-r border-slate-200">
                        {m.name} <span className="text-[9px] font-normal text-slate-500">({m.seat_label || "জেনারেল"})</span>
                      </td>
                      <td className="p-1.5 font-mono text-[10px] text-slate-600 border-r border-slate-200">{m.phone || "-"}</td>
                      <td className="p-1.5 text-center font-bold border-r border-slate-200">{m.total_meals}</td>
                      <td className="p-1.5 text-right border-r border-slate-200">৳{m.meal_cost.toFixed(1)}</td>
                      <td className="p-1.5 text-right border-r border-slate-200">৳{m.fixed_cost_share.toFixed(0)}</td>
                      <td className="p-1.5 text-right font-black text-slate-900 border-r border-slate-200">
                        ৳{m.total_cost.toFixed(1)}
                      </td>
                      <td className="p-1.5 text-right font-bold text-emerald-800 border-r border-slate-200">
                        ৳{m.total_deposit.toLocaleString()}
                      </td>
                      <td
                        className={`p-1.5 text-right font-black border-r border-slate-200 ${
                          isRefund ? "text-emerald-700" : isDue ? "text-rose-700" : "text-slate-700"
                        }`}
                      >
                        {isRefund ? `+৳${m.balance.toFixed(0)}` : isDue ? `-৳${Math.abs(m.balance).toFixed(0)}` : "৳০"}
                      </td>
                      <td className="p-1.5 text-center font-bold text-[10px]">
                        {isRefund ? (
                          <span className="text-emerald-800 font-extrabold">ফেরত পাবে</span>
                        ) : isDue ? (
                          <span className="text-rose-700 font-extrabold">বকেয়া আছে</span>
                        ) : (
                          <span className="text-slate-600">পরিশোধিত</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 text-slate-950 font-black border-t-2 border-slate-900 text-[11px]">
                  <td colSpan={3} className="p-1.5 text-right uppercase border-r border-slate-300">
                    সর্বমোট যোগফল:
                  </td>
                  <td className="p-1.5 text-center border-r border-slate-300">{kpis.total_meals}</td>
                  <td className="p-1.5 text-right border-r border-slate-300">৳{kpis.total_bazar.toLocaleString()}</td>
                  <td className="p-1.5 text-right border-r border-slate-300">৳{kpis.total_fixed_cost.toLocaleString()}</td>
                  <td className="p-1.5 text-right border-r border-slate-300">
                    ৳{(kpis.total_bazar + kpis.total_fixed_cost).toLocaleString()}
                  </td>
                  <td className="p-1.5 text-right border-r border-slate-300 text-emerald-950">
                    ৳{kpis.total_deposits.toLocaleString()}
                  </td>
                  <td className="p-1.5 text-right border-r border-slate-300 font-black" colSpan={2}>
                    ক্যাশ উদ্বৃত্ত: ৳{kpis.cash_in_hand.toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: 31-Day Compact Meal Matrix */}
        <div className="mb-6 page-break-inside-avoid">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2 border-l-4 border-slate-900 pl-2">
            ২. মাসিক ৩১ দিনের সম্পূর্ণ মিল চার্ট
          </h2>
          <div className="overflow-x-auto border border-slate-300 rounded-md">
            <table className="w-full text-center text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-1 text-left border-r border-slate-300 w-28">সদস্যের নাম</th>
                  {Array.from({ length: days_in_month }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="p-1 border-r border-slate-200 w-5">
                      {d}
                    </th>
                  ))}
                  <th className="p-1 bg-slate-200 font-black w-10">মোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {members.map((m: any) => (
                  <tr key={m.user_id}>
                    <td className="p-1 text-left font-bold text-slate-900 border-r border-slate-300 truncate max-w-[110px]">
                      {m.name}
                    </td>
                    {Array.from({ length: days_in_month }, (_, i) => i + 1).map((d) => {
                      const count = m.daily_meals[d] || 0;
                      return (
                        <td
                          key={d}
                          className={`p-1 border-r border-slate-200 ${
                            count === 0 ? "text-slate-300" : "font-bold text-slate-900"
                          }`}
                        >
                          {count === 0 ? "-" : count}
                        </td>
                      );
                    })}
                    <td className="p-1 font-black bg-slate-100 text-slate-950">{m.total_meals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Official Signatures Footer */}
        <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-400 flex justify-between items-end text-xs text-slate-800">
          <div className="text-center w-56">
            <div className="border-b border-slate-900 pb-1 mb-1 font-bold"></div>
            <div className="font-black text-slate-950">মেস ম্যানেজার স্বাক্ষর</div>
            <div className="text-[10px] text-slate-500">তারিখ: ____/____/২০২__</div>
          </div>
          <div className="text-center text-[10px] text-slate-500 max-w-xs">
            এই হিসাব ডিজিটালভাবে সংরক্ষিত ও পরীক্ষিত। কোনো অমিল বা আপত্তি থাকলে হিসাব ক্লোজিংয়ের ৩ দিনের মধ্যে ম্যানেজারকে জানান।
          </div>
          <div className="text-center w-56">
            <div className="border-b border-slate-900 pb-1 mb-1 font-bold"></div>
            <div className="font-black text-slate-950">নিরীক্ষক / মেম্বার প্রতিনিধি</div>
            <div className="text-[10px] text-slate-500">তারিখ: ____/____/২০২__</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MasterSheetPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-600 font-semibold">
          অডিট প্রিন্ট শিট লোড হচ্ছে...
        </div>
      }
    >
      <MasterSheetPrintContent />
    </Suspense>
  );
}
