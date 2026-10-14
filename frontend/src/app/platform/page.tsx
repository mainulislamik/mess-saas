"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Wallet,
  TrendingUp,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  Layers,
  Search,
} from "lucide-react";

interface OverviewStats {
  total_messes: number;
  active_messes: number;
  suspended_messes: number;
  demo_messes: number;
  total_users: number;
  active_users: number;
  total_meals_recorded: number;
  total_bazar_turnover: number;
  total_deposits_turnover: number;
  total_subscription_revenue: number;
  server_metrics: {
    status: string;
    disk_total_gb: number;
    disk_used_gb: number;
    disk_free_gb: number;
    disk_percent: number;
    timestamp: string;
  };
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/platform/overview");
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ওভারভিউ তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm">
        {error || "ডাটা পাওয়া যায়নি"}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">প্ল্যাটফর্ম সার্বিক ওভারভিউ</h2>
          <p className="text-sm text-slate-500 mt-1">
            সারা বাংলাদেশে চলমান সব মেস, সদস্য, মিল কাউন্ট ও আর্থিক টার্নওভার মনিটরিং
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/platform/messes"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>মেস তালিকা ও কন্ট্রোল</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Row 1: Tenants & Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Messes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট মেস</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.total_messes}</span>
            <span className="text-xs text-slate-400">টি মেস</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> {data.active_messes} সচল
            </span>
            <span className="text-rose-600">{data.suspended_messes} স্থগিত</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট ব্যাচেলর সদস্য</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.total_users}</span>
            <span className="text-xs text-slate-400">জন</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="text-emerald-700 font-medium">{data.active_users} জন সক্রিয়</span>
            <span className="text-slate-400">১০০% ভেরিফাইড</span>
          </div>
        </div>

        {/* Total Meals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট প্রস্তুত মিল</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.total_meals_recorded.toLocaleString("bn-BD")}</span>
            <span className="text-xs text-slate-400">টি খাবার</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            সকাল, দুপুর ও রাতের হিসাব
          </div>
        </div>

        {/* Total Bazar Turnover */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট বাজার টার্নওভার</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400">৳</span>
            <span className="text-3xl font-extrabold text-slate-900">
              {data.total_bazar_turnover.toLocaleString("bn-BD")}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-emerald-700 font-medium">
            লাইভ লেনদেন ভলিউম
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2: Financials & Server Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposits & Platform Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>সেন্ট্রাল ফিন্যান্সিয়াল মেট্রিক্স</span>
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">মোট মেম্বার ডিপোজিট ভলিউম</div>
                <div className="text-lg font-extrabold text-slate-900">
                  ৳ {data.total_deposits_turnover.toLocaleString("bn-BD")}
                </div>
              </div>
              <div className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-medium">
                সচল
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">SaaS সাবস্ক্রিপশন রেভিনিউ</div>
                <div className="text-lg font-extrabold text-slate-900">
                  ৳ {data.total_subscription_revenue.toLocaleString("bn-BD")}
                </div>
              </div>
              <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                MRR
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/platform/revenue"
              className="w-full block text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              বিকাশ/নগদ পেমেন্ট ভেরিফাই করুন →
            </Link>
          </div>
        </div>

        {/* Server & Infrastructure Health (StockWhisk inspiration) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>সার্ভার রিসোর্স ও হোস্টিং স্বাস্থ্য (Ubuntu 24.04 LTS)</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              {data.server_metrics.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">হোস্ট ডিস্ক স্পেস</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {data.server_metrics.disk_used_gb} GB / {data.server_metrics.disk_total_gb} GB
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${data.server_metrics.disk_percent}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>{data.server_metrics.disk_percent}% ব্যবহৃত</span>
                <span>{data.server_metrics.disk_free_gb} GB ফাঁকা</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">ডাটাবেজ ইঞ্জিন</div>
              <div className="text-xl font-bold text-slate-900 mt-1">PostgreSQL 16</div>
              <div className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> পোর্ট ৫৪৩৬ এ কানেক্টেড
              </div>
              <div className="text-[11px] text-slate-400 mt-1">কানেকশন পুল সচল</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">ক্যাশ ও সেশন স্টোর</div>
              <div className="text-xl font-bold text-slate-900 mt-1">Redis 7-Alpine</div>
              <div className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> পোর্ট ৬৩৮৫ এ কানেক্টেড
              </div>
              <div className="text-[11px] text-slate-400 mt-1">ইন-মেমোরি ফাস্ট লোড</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>FastAPI v0.115 • Next.js v15.2.4 (Turbopack) • Docker Compose Engine</span>
            <span className="text-emerald-400">আপটাইম ১০০%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
