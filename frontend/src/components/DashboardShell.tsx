"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  CalendarCheck,
  ShoppingBag,
  FileCheck2,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Menu,
  X,
  Utensils,
  PlusCircle,
  Sparkles,
  ArrowRight,
  CreditCard,
} from "lucide-react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    currentMess,
    userMesses,
    setCurrentMess,
    logout,
    isLoading,
    portalMode,
    setPortalMode,
    isManager,
  } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dashboard_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard_collapsed", next ? "1" : "0");
      return next;
    });
  };

  const navItems =
    portalMode === "manager"
      ? [
          { href: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
          { href: "/dashboard/meals", label: "মিল কাউন্ট ও শিট", icon: CalendarCheck },
          { href: "/dashboard/bazar", label: "বাজার ও অন্যান্য খরচ", icon: ShoppingBag },
          { href: "/dashboard/closing", label: "মাস সমাপনী (Closing)", icon: FileCheck2 },
          { href: "/dashboard/messes", label: "মেস সেটিংস ও সদস্য", icon: Building2 },
        ]
      : [
          { href: "/dashboard", label: "আমার খতিয়ান ও হিসাব", icon: LayoutDashboard },
          { href: "/dashboard/meals", label: "আমার মিল রিকোয়েস্ট", icon: CalendarCheck },
          { href: "/dashboard/bazar", label: "বাজার শিডিউল ও তালিকা", icon: ShoppingBag },
        ];

  const isSuperAdmin =
    user?.is_superuser ||
    user?.phone === "+880****2233" ||
    user?.phone === "01711002233" ||
    user?.phone?.toLowerCase() === "it";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Loading Overlay */}
      {(isLoading || !mounted) && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-xs z-[100] flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`bg-white border-r border-slate-200/90 flex flex-col shrink-0 transition-all duration-300 fixed md:sticky top-0 h-screen z-50 ${
          collapsed ? "md:w-20" : "md:w-64"
        } ${
          mobileOpen
            ? "translate-x-0 w-72 shadow-2xl"
            : "-translate-x-full md:translate-x-0 w-64"
        }`}
      >
        {/* Brand Logo & Close button */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">
                  মেস ম্যানেজার
                </h1>
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Smart Mess OS
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs mx-auto"
            >
              <Utensils className="w-5 h-5" />
            </Link>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors hidden md:block"
            title={collapsed ? "বড় করুন" : "ছোট করুন"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mess Selector & Dual-Mode Switcher */}
        {!collapsed && currentMess && (
          <div className="p-3 border-b border-slate-100 bg-slate-50/60 space-y-2.5">
            {/* Mess Selector Card */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-600" /> বর্তমান মেস
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {currentMess.my_role === "owner"
                    ? "মালিক"
                    : currentMess.my_role === "manager"
                    ? "ম্যানেজার"
                    : "সদস্য"}
                </span>
              </div>
              <select
                value={currentMess.id}
                onChange={(e) => {
                  const m = userMesses.find((x) => x.id === e.target.value);
                  if (m) setCurrentMess(m);
                }}
                className="w-full bg-slate-50 font-bold text-slate-800 text-xs rounded-lg px-2 py-1.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {userMesses.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.my_role === "owner" ? "মালিক" : m.my_role === "manager" ? "ম্যানেজার" : "সদস্য"})
                  </option>
                ))}
              </select>
            </div>

            {/* Dual Mode Switcher (For Managers/Owners only) */}
            {isManager && (
              <div className="bg-slate-200/70 p-1 rounded-xl flex items-center text-xs font-bold">
                <button
                  onClick={() => setPortalMode("manager")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    portalMode === "manager"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>ম্যানেজমেন্ট</span>
                </button>
                <button
                  onClick={() => setPortalMode("member")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    portalMode === "member"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>আমার হিসাব</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  active
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Super Admin & User Profile */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* Super Admin Quick Link */}
          {isSuperAdmin && !collapsed && (
            <Link
              href="/platform"
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-bold shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>সুপার অ্যাডমিন প্ল্যাটফর্ম</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          )}

          {isSuperAdmin && collapsed && (
            <Link
              href="/platform"
              title="সুপার অ্যাডমিন প্ল্যাটফর্ম"
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </Link>
          )}

          {/* User Profile Card */}
          {!collapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">
                  {user?.name ? user.name[0] : "ইউ"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || "ব্যবহারকারী"}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {user?.phone || ""}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                title="লগআউট"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              title="লগআউট"
              className="w-10 h-10 mx-auto flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden cursor-pointer"
              title="মেনু খুলুন"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Mess & Portal Title */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {currentMess?.name || "মেস ড্যাশবোর্ড"}
                </h2>
                {currentMess && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {portalMode === "manager" ? "🛡️ ম্যানেজমেন্ট মোড" : "👤 সদস্য ভিউ"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header: Shortcuts */}
          <div className="flex items-center gap-3">
            {portalMode === "manager" ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/meals"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200/60 transition-colors"
                >
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>আজকের মিল এন্ট্রি</span>
                </Link>
                <Link
                  href="/dashboard/bazar"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>বাজার খরচ যোগ</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard/meals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>আমার মিল পরিচালনা</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <div className="flex-1 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
