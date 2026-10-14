"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Server,
  Activity,
  AlertOctagon,
} from "lucide-react";

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout, revertImpersonation, isImpersonating } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("platform_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  // Access control guard
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.is_superuser && user.phone !== "+8801711002233" && user.phone !== "01711002233") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("platform_collapsed", next ? "1" : "0");
      return next;
    });
  };

  const navItems = [
    { href: "/platform", label: "সার্বিক ওভারভিউ", icon: LayoutDashboard },
    { href: "/platform/messes", label: "মেস কন্ট্রোল", icon: Building2 },
    { href: "/platform/users", label: "ইউজার তালিকা", icon: Users },
    { href: "/platform/revenue", label: "সাবস্ক্রিপশন ও রেভিনিউ", icon: CreditCard },
    { href: "/platform/announcements", label: "নোটিশ ব্রডকাস্ট", icon: Bell },
    { href: "/platform/settings", label: "সিস্টেম সেটিংস", icon: Settings },
  ];

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 font-medium px-4 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-sm">
            <AlertOctagon className="w-4 h-4 text-slate-950" />
            <span>
              আপনি বর্তমানে <strong>{user?.name}</strong> ({user?.phone}) এর অ্যাকাউন্টে ইমপারসোনেটেড অবস্থায় আছেন।
            </span>
          </div>
          <button
            onClick={async () => {
              await revertImpersonation();
              router.push("/platform");
            }}
            className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all"
          >
            অ্যাডমিন প্যানেলে ফিরুন
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-200 sticky top-0 h-screen z-30 ${
          collapsed ? "w-20" : "w-64"
        } ${isImpersonating ? "pt-10" : ""}`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {!collapsed ? (
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  মে
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 text-base leading-tight">মেস ম্যানেজার</h1>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    সুপার অ্যাডমিন
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm mx-auto">
              মে
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors hidden md:block"
            title={collapsed ? "বড় করুন" : "ছোট করুন"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-emerald-400" : "text-slate-500"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Server Status Badge & Footer */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {!collapsed && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  সিস্টেম স্ট্যাটাস
                </span>
                <span className="font-semibold text-emerald-700">১০০% সচল</span>
              </div>
              <div className="text-[11px] text-slate-400">Postgres 16 • Redis 7</div>
            </div>
          )}

          {/* Quick Exit to User Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
            title="মেস ড্যাশবোর্ডে ফিরুন"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            {!collapsed && <span>মেস ড্যাশবোর্ডে ফিরুন</span>}
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
            title="লগআউট"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            {!collapsed && <span>লগআউট</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-x-hidden ${isImpersonating ? "pt-10" : ""}`}>
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>প্ল্যাটফর্ম</span>
              <span>/</span>
              <span className="font-semibold text-slate-900">কন্ট্রোল প্যানেল</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>রুট সুপার অ্যাডমিন প্রিভিলেজ</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {user?.name?.slice(0, 2) || "SA"}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-none">{user?.name}</div>
                <div className="text-[11px] text-slate-500">{user?.phone}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
