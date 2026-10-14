"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Utensils,
  LayoutDashboard,
  CalendarCheck,
  ShoppingBag,
  Receipt,
  FileCheck2,
  Building2,
  LogOut,
  User,
} from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();
  const { user, currentMess, userMesses, setCurrentMess, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/dashboard/meals", label: "মিল কাউন্ট", icon: CalendarCheck },
    { href: "/dashboard/bazar", label: "বাজার খরচ", icon: ShoppingBag },
    { href: "/dashboard/closing", label: "মাস সমাপনী (Closing)", icon: FileCheck2 },
    { href: "/dashboard/messes", label: "মেস সেটিংস", icon: Building2 },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Mess Selector */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline font-extrabold tracking-tight text-lg text-emerald-950">
                মেস ম্যানেজার
              </span>
            </Link>

            {userMesses.length > 0 && currentMess && (
              <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <select
                  value={currentMess.id}
                  onChange={(e) => {
                    const m = userMesses.find((x) => x.id === e.target.value);
                    if (m) setCurrentMess(m);
                  }}
                  className="bg-transparent font-semibold text-slate-900 border-none focus:outline-none cursor-pointer pr-1"
                >
                  {userMesses.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.my_role === "owner" ? "মালিক" : m.my_role === "manager" ? "ম্যানেজার" : "সদস্য"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{user?.name || "ব্যবহারকারী"}</div>
              <div className="text-[11px] font-mono text-slate-500">{user?.phone || ""}</div>
            </div>
            <button
              onClick={logout}
              title="লগআউট"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-100 px-2 py-1.5 bg-slate-50/50 gap-1 text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                isActive
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
