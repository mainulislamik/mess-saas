"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";
import MemberDashboardView from "@/components/MemberDashboardView";
import {
  Utensils,
  ShoppingBag,
  Receipt,
  Wallet,
  Users,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, currentMess, isLoading, portalMode } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  if (portalMode === "member") {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MemberDashboardView />
        </main>
      </div>
    );
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (currentMess) {
      setLoadingStats(true);
      api.get(`/messes/${currentMess.id}/dashboard`)
        .then((res) => {
          setStats(res.data);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoadingStats(false);
        });
    }
  }, [user, currentMess, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!currentMess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardNav />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl mx-auto flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">আপনি কোনো মেসে যুক্ত নন</h1>
          <p className="text-slate-600 mb-6">
            নতুন মেস তৈরি করে বন্ধুদের ইনভাইট করুন অথবা ফ্রেন্ডের মেস কোড দিয়ে জয়েন করুন।
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/messes"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow hover:bg-emerald-700 transition-all inline-flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> নতুন মেস তৈরি করুন / যোগ দিন
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-700/60 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> চলতি মাসের লাইভ হিসাব ({stats?.month || ""})
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {stats?.mess_name || currentMess.name}
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                আপনার মেম্বারশিপ রোল: <span className="font-bold uppercase text-white bg-emerald-700/80 px-2 py-0.5 rounded text-xs">{stats?.my_role || currentMess.my_role}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/dashboard/meals"
                className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-sm font-bold shadow hover:bg-emerald-50 transition-all inline-flex items-center gap-1.5"
              >
                <Utensils className="w-4 h-4 text-emerald-700" /> আজকের মিল এন্ট্রি
              </Link>
              <Link
                href="/dashboard/bazar"
                className="px-4 py-2 bg-emerald-700/80 hover:bg-emerald-700 text-white border border-emerald-500/50 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" /> বাজার খরচ যোগ করুন
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Estimated Meal Rate */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">লাইভ মিল রেট</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ৳{stats?.estimated_meal_rate?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                মোট বাজার ÷ মোট মিল
              </div>
            </div>
          </div>

          {/* Card 2: Total Bazar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">চলতি মাসের বাজার</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ৳{stats?.month_total_bazar?.toLocaleString("bn-BD") || "০"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                মোট মিল খাওয়া হয়েছে: <span className="font-bold text-slate-700">{stats?.month_total_meals || 0} টি</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Fixed Costs */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">মোট ফিক্সড খরচ</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ৳{stats?.month_total_fixed_cost?.toLocaleString("bn-BD") || "০"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                জনপ্রতি শেয়ার: <span className="font-bold text-slate-700">৳{stats?.my_fixed_cost_share || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 4: My Personal Balance */}
          <div className={`rounded-2xl p-6 border shadow-xs flex flex-col justify-between ${
            (stats?.my_balance || 0) >= 0
              ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
              : "bg-rose-50/60 border-rose-200 text-rose-950"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">আমার বর্তমান ব্যালেন্স</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                (stats?.my_balance || 0) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                {(stats?.my_balance || 0) >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div>
              <div className={`text-3xl font-extrabold tracking-tight ${
                (stats?.my_balance || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}>
                ৳{Math.abs(stats?.my_balance || 0).toLocaleString("bn-BD")}
                <span className="text-sm font-bold ml-1.5">
                  {(stats?.my_balance || 0) >= 0 ? "(মেস ফেরত দিবে)" : "(মেসে বাকি)"}
                </span>
              </div>
              <div className="text-xs opacity-75 mt-1">
                আমার জমা: ৳{stats?.my_total_deposit || 0} | মিল: {stats?.my_month_meals || 0} টি
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column: Today Overview & Recent Bazar History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Today Meal Summary & Quick Actions */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">আজকের মিল সামারি</h2>
                <p className="text-xs text-slate-500">তারিখ: {stats?.today_date}</p>
              </div>
              <Link
                href="/dashboard/meals"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                ম্যানেজ করুন <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">আজ মেসে মোট মিল</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.today_total_meals || 0} <span className="text-sm font-normal text-slate-500">টি</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-xs text-emerald-700 font-medium">আপনার আজকের মিল</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">
                  {stats?.today_my_meals || 0} <span className="text-sm font-normal text-emerald-700">টি</span>
                </div>
              </div>
            </div>

            {/* Live Formula Explainer */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">স্বচ্ছতার ফর্মুলা:</span> মেসের সমস্ত খরচ অটোমেটিক আপডেট হচ্ছে। মাস শেষে মেস ম্যানেজার বন্ধ করার সময় প্রতিটি মেম্বারের ফাইনাল ব্যালেন্স শিট তৈরি হবে।
            </div>
          </div>

          {/* Right Column: Recent Bazar Feed */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">সাম্প্রতিক বাজার তালিকা</h2>
                <p className="text-xs text-slate-500">সর্বশেষ বাজার খরচের রেকর্ড</p>
              </div>
              <Link
                href="/dashboard/bazar"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                সব দেখুন <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {stats?.recent_bazars && stats.recent_bazars.length > 0 ? (
                stats.recent_bazars.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{b.items}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-700">{b.user_name}</span>
                        <span>•</span>
                        <span>{b.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-700">
                        ৳{b.amount.toLocaleString("bn-BD")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  এখনো কোনো বাজারের হিসাব যোগ করা হয়নি।
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
