"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Home,
  Zap,
  Flame,
  Wifi,
  Trash2,
  Droplets,
  Sparkles,
  Plus,
  Trash,
  Save,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Activity,
  X,
  RefreshCw,
  Info,
} from "lucide-react";

interface MemberItem {
  id: string;
  user_id: string;
  user_name: string;
  phone: string;
  role: string;
  seat_label: string | null;
  rent_amount: number;
}

interface UtilityItem {
  id: string;
  mess_id: string;
  month: string;
  category: string;
  title: string;
  amount: number;
  split_type: string;
  sub_type?: string | null;
  cost_date?: string | null;
  billing_date?: string | null;
  notes?: string | null;
  meta_data?: any;
  created_at?: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  cook_maid: { label: "বুয়ার বেতন", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  gas: { label: "গ্যাস বিল/সিলিন্ডার", icon: Flame, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  electricity: { label: "বিদ্যুৎ বিল/রিচার্জ", icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  wifi: { label: "ওয়াইফাই বিল", icon: Wifi, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  waste: { label: "ময়লা বিল", icon: Trash2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  water: { label: "পানি বিল/ফিল্টার", icon: Droplets, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200" },
  rent: { label: "মেসের সাধারণ ভাড়া", icon: Home, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  other: { label: "অন্যান্য খরচ", icon: Layers, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

export default function RentUtilitiesPage() {
  const router = useRouter();
  const { user, currentMess, isLoading } = useAuth();

  const [month, setMonth] = useState("");
  const [activeTab, setActiveTab] = useState<"rent" | "utilities" | "tracker" | "summary">("rent");
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [utilities, setUtilities] = useState<UtilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRent, setSavingRent] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalCategory, setModalCategory] = useState("cook_maid");
  const [modalSubType, setModalSubType] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const isManagerOrOwner =
    currentMess?.my_role?.toLowerCase() === "owner" ||
    currentMess?.my_role?.toLowerCase() === "manager";

  // Init Month
  useEffect(() => {
    const current = new Date().toISOString().slice(0, 7);
    setMonth(current);
    setModalDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Fetch Data
  const fetchData = async () => {
    if (!currentMess?.id) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const [membersRes, utilsRes] = await Promise.all([
        api.get(`/messes/${currentMess.id}/members`),
        api.get(`/messes/${currentMess.id}/fixed-costs?month=${targetMonth}`),
      ]);

      const formattedMembers = (membersRes.data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        user_name: m.user_name || m.user?.name || "সদস্য",
        phone: m.phone || m.user?.phone || "",
        role: m.role || "member",
        seat_label: m.seat_label || "",
        rent_amount: Number(m.rent_amount) || 0,
      }));

      setMembers(formattedMembers);
      const items = Array.isArray(utilsRes.data)
        ? utilsRes.data
        : (utilsRes.data?.items || []);
      setUtilities(items);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "তথ্য লোড করতে সমস্যা হয়েছে",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (currentMess?.id && month) {
      fetchData();
    }
  }, [user, currentMess, isLoading, month]);

  // Handle Rent Field Updates
  const handleMemberChange = (userId: string, field: "seat_label" | "rent_amount", value: any) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.user_id === userId) {
          return {
            ...m,
            [field]: field === "rent_amount" ? parseFloat(value) || 0 : value,
          };
        }
        return m;
      })
    );
  };

  // Save Rent Batch
  const handleSaveRentBatch = async () => {
    if (!currentMess?.id || !isManagerOrOwner) return;
    setSavingRent(true);
    setStatusMessage(null);
    try {
      const payload = {
        members: members.map((m) => ({
          user_id: m.user_id,
          rent_amount: Number(m.rent_amount) || 0,
          seat_label: m.seat_label || null,
        })),
      };

      await api.patch(`/messes/${currentMess.id}/members-rent`, payload);
      setStatusMessage({
        type: "success",
        text: "সদস্যদের সিট/রুমের বাড়িভাড়া সফলভাবে আপডেট হয়েছে!",
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "ভাড়া সংরক্ষণ করতে ব্যর্থ হয়েছে",
      });
    } finally {
      setSavingRent(false);
    }
  };

  // Add Utility
  const handleAddUtility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess?.id || !isManagerOrOwner) return;
    setModalSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        month: month || new Date().toISOString().slice(0, 7),
        category: modalCategory,
        sub_type: modalSubType || null,
        title: modalTitle.trim(),
        amount: parseFloat(modalAmount) || 0,
        split_type: "equal",
        cost_date: modalDate || null,
        billing_date: modalDate || null,
        notes: modalNotes.trim() || null,
      };

      await api.post(`/messes/${currentMess.id}/fixed-costs`, payload);
      setShowAddModal(false);
      setModalTitle("");
      setModalAmount("");
      setModalNotes("");
      setModalSubType("");
      setStatusMessage({
        type: "success",
        text: "নতুন মাসিক ইউটিলিটি বিল সফলভাবে যোগ করা হয়েছে!",
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "বিল যোগ করতে সমস্যা হয়েছে",
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Utility
  const handleDeleteUtility = async (id: string, title: string) => {
    if (!isManagerOrOwner || !currentMess?.id) return;
    if (!confirm(`আপনি কি নিশ্চিত যে "${title}" বিলটি মুছে ফেলতে চান?`)) return;
    try {
      await api.delete(`/messes/${currentMess.id}/fixed-costs/${id}`);
      setUtilities((prev) => prev.filter((u) => u.id !== id));
      setStatusMessage({
        type: "success",
        text: `"${title}" সফলভাবে মুছে ফেলা হয়েছে`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "বিল মুছতে সমস্যা হয়েছে",
      });
    }
  };

  // Calculations
  const memberCount = members.length;
  const totalIndividualRent = useMemo(() => {
    return members.reduce((sum, m) => sum + (Number(m.rent_amount) || 0), 0);
  }, [members]);

  const sharedUtilities = useMemo(() => {
    return utilities.filter((u) => u.category !== "rent");
  }, [utilities]);

  const totalSharedUtilities = useMemo(() => {
    return sharedUtilities.reduce((sum, u) => sum + (Number(u.amount) || 0), 0);
  }, [sharedUtilities]);

  const sharedPerMember = useMemo(() => {
    return memberCount > 0 ? totalSharedUtilities / memberCount : 0;
  }, [totalSharedUtilities, memberCount]);

  const totalFlatCost = totalIndividualRent + totalSharedUtilities;

  // Gas and Electricity Items
  const gasItems = useMemo(() => utilities.filter((u) => u.category === "gas"), [utilities]);
  const electricityItems = useMemo(() => utilities.filter((u) => u.category === "electricity"), [utilities]);

  // LPG Cylinder Insights
  const latestLpgCylinder = useMemo(() => {
    const lpgList = gasItems.filter((g) => g.sub_type === "lpg_cylinder" || g.title.toLowerCase().includes("সিলিন্ডার") || g.title.toLowerCase().includes("cylinder"));
    if (lpgList.length === 0) return null;
    return lpgList[0];
  }, [gasItems]);

  const daysSinceLpg = useMemo(() => {
    const d = latestLpgCylinder?.cost_date || latestLpgCylinder?.billing_date;
    if (!d) return null;
    const diffTime = Math.abs(new Date().getTime() - new Date(d).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [latestLpgCylinder]);

  // Filtered Utilities List
  const filteredUtilities = useMemo(() => {
    if (categoryFilter === "all") return utilities;
    return utilities.filter((u) => u.category === categoryFilter);
  }, [utilities, categoryFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                বাড়িভাড়া ও ইউটিলিটি বিল (Rent & Utilities)
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                সদস্যদের নিজস্ব বাড়িভাড়া, ফিক্সড বুয়ার বেতন, গ্যাস সিলিন্ডার, বিদ্যুৎ রিচার্জ ও ফ্ল্যাট বিল ব্যবস্থাপনা
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 mr-2" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-hidden"
            />
          </div>

          {isManagerOrOwner && (
            <button
              onClick={() => {
                setModalCategory("cook_maid");
                setModalTitle("বুয়ার ফিক্সড মাসিক বেতন");
                setModalAmount("");
                setModalSubType("");
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ইউটিলিটি বিল যোগ</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold px-2 py-1 hover:bg-black/5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Flat Cost */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              মোট ফ্ল্যাট খরচ
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              ৳{totalFlatCost.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">ভাড়া ও শেয়ার্ড ইউটিলিটি মিলিয়ে</p>
        </div>

        {/* Total House Rent */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              মোট বাড়িভাড়া
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-700">
              ৳{totalIndividualRent.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">সব মেম্বারের সিট ভাড়া যোগফল</p>
        </div>

        {/* Total Shared Utilities */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              শেয়ার্ড ইউটিলিটি
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-purple-700">
              ৳{totalSharedUtilities.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">বুয়া, গ্যাস, বিদ্যুৎ, ওয়াইফাই, ময়লা</p>
        </div>

        {/* Per Member Utility Share */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              জনপ্রতি ইউটিলিটি
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">
              ৳{Math.round(sharedPerMember).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">/ জন</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{memberCount} জন সক্রিয় সদস্যের মধ্যে সমবণ্টন</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-t-2xl">
        <button
          onClick={() => setActiveTab("rent")}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === "rent"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>সদস্যভিত্তিক বাড়িভাড়া ({memberCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("utilities")}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === "utilities"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>মাসিক ইউটিলিটি বিল ({utilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tracker")}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === "tracker"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>গ্যাস ও বিদ্যুৎ ট্র্যাকার</span>
        </button>

        <button
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === "summary"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>জনপ্রতি মোট খরচের হিসাব</span>
        </button>
      </div>

      {/* Tab 1: Member Seat Rent */}
      {activeTab === "rent" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  সদস্যভিত্তিক আলাদা বাড়িভাড়া নীতি (Individual Seat Rent)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  মেসে সিঙ্গেল রুম, মাস্টার বেড বা শেয়ারিং সিট ভেদে মেম্বারদের ভাড়া ভিন্ন হয়। প্রত্যেক সদস্যের জন্য তার নির্ধারিত সিটের ভাড়া নিচে দিন। এই ভাড়া সরাসরি তার ব্যক্তিগত খতিয়ানে যোগ হবে।
                </p>
              </div>
            </div>

            {isManagerOrOwner && (
              <button
                onClick={handleSaveRentBatch}
                disabled={savingRent}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingRent ? "সংরক্ষণ হচ্ছে..." : "সব ভাড়া সংরক্ষণ করুন"}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <span>মেম্বারদের ভাড়া তালিকা লোড হচ্ছে...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              মেসে কোনো সদস্য যুক্ত করা নেই
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/60">
                    <th className="py-3 px-4">মেম্বার</th>
                    <th className="py-3 px-4">মোবাইল নম্বর</th>
                    <th className="py-3 px-4">রোল</th>
                    <th className="py-3 px-4">রুম / সিটের নাম (Seat Label)</th>
                    <th className="py-3 px-4 w-48">বাড়িভাড়া (৳)</th>
                    <th className="py-3 px-4 text-right">শেয়ার্ড ইউটিলিটি</th>
                    <th className="py-3 px-4 text-right">মোট ফিক্সড বিল</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const memberTotal = (m.rent_amount || 0) + sharedPerMember;
                    return (
                      <tr key={m.user_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {m.user_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                          {m.phone || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              m.role === "owner" || m.role === "manager"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {m.role === "owner" || m.role === "manager" ? "ম্যানেজার" : "সদস্য"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isManagerOrOwner ? (
                            <input
                              type="text"
                              value={m.seat_label || ""}
                              placeholder="যেমন: Room 101, Bed 2"
                              onChange={(e) => handleMemberChange(m.user_id, "seat_label", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-indigo-500 outline-hidden"
                            />
                          ) : (
                            <span className="text-slate-700 text-xs">{m.seat_label || "—"}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isManagerOrOwner ? (
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">৳</span>
                              <input
                                type="number"
                                min="0"
                                value={m.rent_amount === 0 ? "" : m.rent_amount}
                                placeholder="0"
                                onChange={(e) => handleMemberChange(m.user_id, "rent_amount", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2.5 py-1.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-hidden"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-slate-800">৳{m.rent_amount.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-600 font-medium">
                          ৳{Math.round(sharedPerMember).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-indigo-700 text-sm">
                            ৳{Math.round(memberTotal).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-800">
                    <td className="py-3 px-4" colSpan={4}>
                      সর্বমোট বাড়িভাড়া (সব মেম্বার)
                    </td>
                    <td className="py-3 px-4 text-blue-700 font-black text-base">
                      ৳{totalIndividualRent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-purple-700">
                      ৳{totalSharedUtilities.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-800 font-black text-base">
                      ৳{Math.round(totalFlatCost).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Monthly Shared Utilities */}
      {activeTab === "utilities" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs p-5 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              সব ইউটিলিটি ({utilities.length})
            </button>
            {Object.entries(CATEGORY_MAP)
              .filter(([key]) => key !== "rent")
              .map(([key, config]) => {
                const count = utilities.filter((u) => u.category === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === key
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <config.icon className="w-3.5 h-3.5" />
                    <span>{config.label}</span>
                    {count > 0 && <span className="opacity-75">({count})</span>}
                  </button>
                );
              })}
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <span>ইউটিলিটি লোড হচ্ছে...</span>
            </div>
          ) : filteredUtilities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
              <p>এই মাসে কোনো ইউটিলিটি বিল যোগ করা হয়নি</p>
              {isManagerOrOwner && (
                <button
                  onClick={() => {
                    setModalCategory(categoryFilter === "all" ? "cook_maid" : categoryFilter);
                    setModalTitle("");
                    setModalAmount("");
                    setShowAddModal(true);
                  }}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  + নতুন ইউটিলিটি খরচ যোগ করুন
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUtilities.map((item) => {
                const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
                const Icon = cat.icon;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cat.bg} ${cat.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                        </span>
                        {(item.cost_date || item.billing_date) && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {item.cost_date || item.billing_date}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2.5 font-bold text-slate-800 text-base">{item.title}</h3>

                      {item.sub_type && (
                        <span className="inline-block mt-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {item.sub_type === "lpg_cylinder"
                            ? "১২ কেজি সিলিন্ডার"
                            : item.sub_type === "prepaid_recharge"
                            ? "প্রিপেইড রিচার্জ"
                            : item.sub_type === "line_gas"
                            ? "লাইনের ফিক্সড গ্যাস"
                            : item.sub_type}
                        </span>
                      )}

                      {item.notes && (
                        <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block">মোট বিল</span>
                        <span className="text-lg font-black text-slate-900">
                          ৳{item.amount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">জনপ্রতি</span>
                          <span className="text-xs font-bold text-indigo-600">
                            ৳{memberCount > 0 ? Math.round(item.amount / memberCount) : 0}
                          </span>
                        </div>

                        {isManagerOrOwner && (
                          <button
                            onClick={() => handleDeleteUtility(item.id, item.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Gas & Electricity Special Tracker */}
      {activeTab === "tracker" && (
        <div className="space-y-6">
          {/* LPG Cylinder Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    এলপিজি গ্যাস সিলিন্ডার মনিটর (LPG Cylinder Tracker)
                  </h3>
                  <p className="text-xs text-slate-500">
                    মেসের সিলিন্ডার ক্রয়ের তারিখ, রানিং সিলিন্ডার কতদিন ধরে চলছে এবং খরচ ট্র্যাকিং
                  </p>
                </div>
              </div>

              {isManagerOrOwner && (
                <button
                  onClick={() => {
                    setModalCategory("gas");
                    setModalSubType("lpg_cylinder");
                    setModalTitle("১২ কেজি এলপিজি সিলিন্ডার রিফিল");
                    setModalAmount("1450");
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন সিলিন্ডার এন্ট্রি</span>
                </button>
              )}
            </div>

            {/* Current Active Cylinder Card */}
            {latestLpgCylinder ? (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold inline-block">
                    রানিং সিলিন্ডার
                  </span>
                  <h4 className="text-base font-bold text-slate-800 mt-1">
                    {latestLpgCylinder.title} (৳{latestLpgCylinder.amount})
                  </h4>
                  <p className="text-xs text-slate-600">
                    ইনস্টল/ক্রয় তারিখ: <span className="font-mono font-semibold">{latestLpgCylinder.cost_date || latestLpgCylinder.billing_date || "—"}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-xl border border-amber-200">
                  <Activity className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="text-xs text-slate-500 block">চলমান ব্যবহারের মেয়াদ</span>
                    <span className="text-xl font-black text-amber-700">
                      {daysSinceLpg !== null ? `${daysSinceLpg} দিন` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">
                এই মাসে এখনও কোনো এলপিজি সিলিন্ডার এন্ট্রি দেওয়া হয়নি
              </div>
            )}

            {/* Gas History List */}
            {gasItems.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  এই মাসের গ্যাস খরচের তালিকা
                </h5>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {gasItems.map((g) => (
                    <div key={g.id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800 text-sm">{g.title}</span>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{g.cost_date || g.billing_date || "তারিখ নেই"}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">৳{g.amount}</span>
                        <span className="block text-[11px] text-slate-400">জনপ্রতি ৳{memberCount > 0 ? Math.round(g.amount / memberCount) : 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Electricity Prepaid Token Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    বিদ্যুৎ বিল ও প্রিপেইড মিটার রিচার্জ লগ
                  </h3>
                  <p className="text-xs text-slate-500">
                    ডেসকো/ডিপিডিসি প্রিপেইড কার্ড রিচার্জ অথবা মাসিক পোস্টপেইড বিদ্যুৎ বিল ট্র্যাকিং
                  </p>
                </div>
              </div>

              {isManagerOrOwner && (
                <button
                  onClick={() => {
                    setModalCategory("electricity");
                    setModalSubType("prepaid_recharge");
                    setModalTitle("প্রিপেইড মিটার রিচার্জ");
                    setModalAmount("1000");
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন বিদ্যুৎ রিচার্জ এন্ট্রি</span>
                </button>
              )}
            </div>

            {/* Electricity Cards & Table */}
            {electricityItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                এই মাসে এখনও কোনো বিদ্যুৎ রিচার্জ বা বিল এন্ট্রি নেই
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 bg-yellow-50/70 border border-yellow-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-yellow-900">
                    চলতি মাসে মোট বিদ্যুৎ বাবদ খরচ ({electricityItems.length} টি রিচার্জ/বিল)
                  </span>
                  <span className="text-base font-black text-yellow-800">
                    ৳{electricityItems.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {electricityItems.map((e) => (
                    <div key={e.id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800 text-sm">{e.title}</span>
                        {e.notes && <p className="text-xs text-slate-500 mt-0.5">{e.notes}</p>}
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{e.cost_date || e.billing_date || "তারিখ নেই"}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">৳{e.amount}</span>
                        <span className="block text-[11px] text-slate-400">জনপ্রতি ৳{memberCount > 0 ? Math.round(e.amount / memberCount) : 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Per-Member Cost Summary & Transparency */}
      {activeTab === "summary" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs p-5 space-y-4">
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                স্বচ্ছ হিসাব ও মাস্টার শিট সমম্বয়
              </h4>
              <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                প্রতিটি সদস্যের মাসিক মোট খরচ = (তার মোট মিল × মিল রেট) + নিজস্ব বাড়িভাড়া + সমবণ্টনকৃত ইউটিলিটি। নিচের টেবিলে শুধু ফিক্সড ও ফ্ল্যাট খরচের পরিষ্কার ব্রেকডাউন দেওয়া হয়েছে।
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/60">
                  <th className="py-3 px-4">মেম্বার</th>
                  <th className="py-3 px-4">রুম/সিট</th>
                  <th className="py-3 px-4 text-right">নিজস্ব বাড়িভাড়া (৳)</th>
                  <th className="py-3 px-4 text-right">শেয়ার্ড ইউটিলিটি (৳)</th>
                  <th className="py-3 px-4 text-right font-black">মোট ফিক্সড খরচ (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const rent = m.rent_amount || 0;
                  const total = rent + sharedPerMember;
                  return (
                    <tr key={m.user_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">{m.user_name}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{m.seat_label || "—"}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">৳{rent.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-purple-700">৳{Math.round(sharedPerMember).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-base">
                        ৳{Math.round(total).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td className="py-3 px-4" colSpan={2}>
                    মোট ফ্ল্যাট খরচ (সব সদস্য)
                  </td>
                  <td className="py-3 px-4 text-right text-blue-700 font-black">
                    ৳{totalIndividualRent.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-purple-700 font-black">
                    ৳{totalSharedUtilities.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-900 font-black text-lg">
                    ৳{Math.round(totalFlatCost).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Add Utility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">নতুন মাসিক ইউটিলিটি বিল যোগ করুন</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUtility} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">খরচের ক্যাটাগরি *</label>
                <select
                  value={modalCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setModalCategory(cat);
                    if (cat === "cook_maid") {
                      setModalTitle("বুয়ার ফিক্সড মাসিক বেতন");
                      setModalSubType("");
                    } else if (cat === "gas") {
                      setModalTitle("১২ কেজি এলপিজি সিলিন্ডার");
                      setModalSubType("lpg_cylinder");
                    } else if (cat === "electricity") {
                      setModalTitle("বিদ্যুৎ প্রিপেইড মিটার রিচার্জ");
                      setModalSubType("prepaid_recharge");
                    } else if (cat === "wifi") {
                      setModalTitle("মাসিক ওয়াইফাই বিল");
                      setModalSubType("");
                    } else if (cat === "waste") {
                      setModalTitle("মাসিক ময়লা বিল");
                      setModalSubType("");
                    } else if (cat === "water") {
                      setModalTitle("ওয়াসা পানি বিল / ড্রাম");
                      setModalSubType("");
                    } else {
                      setModalTitle("");
                      setModalSubType("");
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                >
                  <option value="cook_maid">বুয়ার বেতন (Cook / Maid)</option>
                  <option value="gas">গ্যাস বিল / সিলিন্ডার (Gas)</option>
                  <option value="electricity">বিদ্যুৎ বিল / রিচার্জ (Electricity)</option>
                  <option value="wifi">ওয়াইফাই বিল (WiFi)</option>
                  <option value="waste">ময়লা বিল (Waste / Cleaner)</option>
                  <option value="water">পানি বিল / ফিল্টার ড্রাম (Water)</option>
                  <option value="rent">মেসের সাধারণ ঘরভাড়া (Rent)</option>
                  <option value="other">অন্যান্য শেয়ার্ড খরচ (Other)</option>
                </select>
              </div>

              {/* Sub-Type (if gas or electricity) */}
              {modalCategory === "gas" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">গ্যাসের ধরণ</label>
                  <select
                    value={modalSubType}
                    onChange={(e) => setModalSubType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-hidden"
                  >
                    <option value="lpg_cylinder">এলপিজি গ্যাস সিলিন্ডার (১২ কেজি)</option>
                    <option value="line_gas">লাইনের গ্যাস (সরকারি ফিক্সড বিল)</option>
                    <option value="prepaid_recharge">প্রিপেইড গ্যাস মিটার রিচার্জ</option>
                  </select>
                </div>
              )}

              {modalCategory === "electricity" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">বিদ্যুতের ধরণ</label>
                  <select
                    value={modalSubType}
                    onChange={(e) => setModalSubType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-hidden"
                  >
                    <option value="prepaid_recharge">প্রিপেইড মিটার টোকেন রিচার্জ</option>
                    <option value="postpaid_bill">পোস্টপেইড অফিসিয়াল বিল</option>
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">বিলের বিবরণ / টাইটেল *</label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="যেমন: অক্টোবর মাসের বুয়ার বেতন"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">টাকার পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder="৳ 0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">বিলের তারিখ</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">নোট / ভাউচার বিবরণ (ঐচ্ছিক)</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="ভাউচার নম্বর, টোকেন বা অন্যান্য তথ্য"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? "সংরক্ষণ হচ্ছে..." : "বিল সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
