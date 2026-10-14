"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  MoreVertical,
  Shield,
  Copy,
  Check,
  PauseCircle,
  PlayCircle,
  Settings2,
  Trash2,
  Plus,
} from "lucide-react";

interface MessItem {
  id: string;
  name: string;
  district: string;
  thana: string;
  area: string;
  invite_code: string;
  plan: string;
  is_active: boolean;
  is_suspended: boolean;
  is_demo: boolean;
  monthly_fee: number;
  features: Record<string, boolean>;
  owner: {
    id: string;
    name: string;
    phone: string;
  } | null;
  member_count: number;
  created_at: string;
}

export default function PlatformMessesPage() {
  const router = useRouter();
  const { impersonateMess } = useAuth();
  const [messes, setMesses] = useState<MessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMesses();
  }, [statusFilter]);

  const fetchMesses = async () => {
    try {
      setLoading(true);
      let url = "/platform/messes";
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status_filter", statusFilter);
      if (search) params.append("search", search);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const res = await api.get(url);
      setMesses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMesses();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleSuspend = async (mess: MessItem) => {
    setActionLoading(mess.id);
    try {
      await api.patch(`/platform/messes/${mess.id}`, {
        is_suspended: !mess.is_suspended,
      });
      fetchMesses();
    } catch (err: any) {
      alert("স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMess = async (mess: MessItem) => {
    if (!confirm(`আপনি কি নিশ্চিত যে '${mess.name}' (কোড: ${mess.invite_code}) মেসটি এবং এর সমস্ত ডাটা চিরতরে মুছে ফেলতে চান?`)) {
      return;
    }
    setActionLoading(mess.id);
    try {
      await api.delete(`/platform/messes/${mess.id}`);
      fetchMesses();
    } catch (err: any) {
      alert(err.response?.data?.detail || "মেস মুছতে ব্যর্থ হয়েছে");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanChange = async (messId: string, plan: string) => {
    try {
      setActionLoading(messId);
      const monthly_fee = plan === "enterprise" ? 499 : plan === "standard" ? 199 : 0;
      await api.patch(`/platform/messes/${messId}`, { plan, monthly_fee });
      await fetchMesses();
    } catch (err) {
      alert("প্ল্যান পরিবর্তন করতে সমস্যা হয়েছে");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLoginAs = async (mess: MessItem) => {
    if (!confirm(`আপনি কি "${mess.name}" মেসের ম্যানেজার হিসেবে লগইন করতে চান?`)) return;
    try {
      setActionLoading(mess.id);
      await impersonateMess(mess.id);
      router.push("/dashboard");
    } catch (err) {
      alert("ইমপারসোনেশন ব্যর্থ হয়েছে");
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">মেস কন্ট্রোল ও ডিরেক্টরি</h2>
          <p className="text-sm text-slate-500 mt-1">
            সারা বাংলাদেশের সকল মেসের স্ট্যাটাস, প্যাকেজ ও এক-ক্লিকে ম্যানেজার লগইন
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {[
            { id: "all", label: "সকল মেস" },
            { id: "active", label: "সচল" },
            { id: "suspended", label: "স্থগিত" },
            { id: "demo", label: "ডেমো মেস" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === tab.id
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
            placeholder="মেসের নাম, জেলা, থানা বা ইনভাইট কোড..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </form>
      </div>

      {/* Messes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">মেসের নাম ও কোড</th>
                <th className="py-3.5 px-4">অবস্থান</th>
                <th className="py-3.5 px-4">মেম্বার</th>
                <th className="py-3.5 px-4">মালিক / ম্যানেজার</th>
                <th className="py-3.5 px-4">SaaS প্যাকেজ</th>
                <th className="py-3.5 px-4">স্ট্যাটাস</th>
                <th className="py-3.5 px-4 text-right">অ্যাডমিন অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    মেসের তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : messes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    কোনো মেস পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                messes.map((mess) => (
                  <tr key={mess.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{mess.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {mess.invite_code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(mess.invite_code)}
                          className="text-slate-400 hover:text-slate-600"
                          title="কোড কপি করুন"
                        >
                          {copiedCode === mess.invite_code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{mess.district}</div>
                      <div className="text-[11px] text-slate-500">
                        {mess.thana}, {mess.area}
                      </div>
                    </td>

                    {/* Members */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {mess.member_count} জন
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      {mess.owner ? (
                        <div>
                          <div className="font-semibold text-slate-900">{mess.owner.name}</div>
                          <div className="text-[11px] text-slate-500">{mess.owner.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <select
                        value={mess.plan.toLowerCase()}
                        onChange={(e) => handlePlanChange(mess.id, e.target.value)}
                        disabled={actionLoading === mess.id}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="free">ফ্রি (৳০)</option>
                        <option value="standard">স্ট্যান্ডার্ড (৳১৯৯/মা)</option>
                        <option value="enterprise">হোস্টেল প্রো (৳৪৯৯/মা)</option>
                      </select>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {mess.is_suspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> স্থগিত
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> সচল
                        </span>
                      )}
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* ⚡ Login As (Impersonation) */}
                        <button
                          onClick={() => handleLoginAs(mess)}
                          disabled={actionLoading === mess.id}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
                          title="মেস ম্যানেজার হিসেবে লগইন করুন"
                        >
                          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                          <span>লগইন করুন</span>
                        </button>

                        {/* Suspend / Resume toggle */}
                        <button
                          onClick={() => handleToggleSuspend(mess)}
                          disabled={actionLoading === mess.id}
                          className={`p-1.5 rounded-lg border transition-all ${
                            mess.is_suspended
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          }`}
                          title={mess.is_suspended ? "মেস পুনরায় সচল করুন" : "মেস সাময়িকভাবে স্থগিত করুন"}
                        >
                          {mess.is_suspended ? (
                            <PlayCircle className="w-4 h-4" />
                          ) : (
                            <PauseCircle className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete mess button */}
                        <button
                          onClick={() => handleDeleteMess(mess)}
                          disabled={actionLoading === mess.id}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all"
                          title="মেস এবং সমস্ত ডাটা ডিলিট করুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
