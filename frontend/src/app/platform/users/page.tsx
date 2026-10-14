"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export default function PlatformUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let url = "/platform/users";
      if (search) url += `?search=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      let list: UserItem[] = res.data;

      if (filter === "active") list = list.filter((u) => u.is_active);
      else if (filter === "blocked") list = list.filter((u) => !u.is_active);
      else if (filter === "superadmin") list = list.filter((u) => u.is_superuser);

      setUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentAdmin?.id) {
      alert("নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা সম্ভব নয়");
      return;
    }
    const action = user.is_active ? "ব্লক" : "সক্রিয়";
    if (!confirm(`আপনি কি "${user.name}" ইউজারকে ${action} করতে চান?`)) return;

    try {
      setActionLoading(user.id);
      await api.post(`/platform/users/${user.id}/toggle-status`);
      await fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ব্যবহারকারী ও সদস্য ডিরেক্টরি</h2>
        <p className="text-sm text-slate-500 mt-1">
          সারা বাংলাদেশের নিবন্ধিত সব ব্যাচেলর মেস মেম্বার ও ওনারদের কেন্দ্রীয় তালিকা
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {[
            { id: "all", label: "সকল ইউজার" },
            { id: "active", label: "সক্রিয়" },
            { id: "blocked", label: "ব্লকড" },
            { id: "superadmin", label: "সুপার অ্যাডমিন" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="নাম বা মোবাইল নম্বর দিয়ে সার্চ করুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">ইউজার ও পদবী</th>
                <th className="py-3.5 px-4">মোবাইল নম্বর</th>
                <th className="py-3.5 px-4">ইমেইল</th>
                <th className="py-3.5 px-4">রোল</th>
                <th className="py-3.5 px-4">স্ট্যাটাস</th>
                <th className="py-3.5 px-4">নিবন্ধনের তারিখ</th>
                <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ইউজার তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    কোনো ইউজার পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                          {u.is_superuser && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" /> প্ল্যাটফর্ম অ্যাডমিন
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-900 font-medium flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.phone}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600">{u.email || "—"}</span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {u.is_superuser ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Super Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          মেস মেম্বার
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> সক্রিয়
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> ব্লকড
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString("bn-BD")}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {u.id !== currentAdmin?.id && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading === u.id}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            u.is_active
                              ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {u.is_active ? "ব্লক করুন" : "আনব্লক করুন"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
