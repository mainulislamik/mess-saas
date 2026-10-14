"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";
import {
  Building2,
  Users,
  Copy,
  Check,
  PlusCircle,
  Share2,
  Shield,
  UserCheck,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function MessSettingsPage() {
  const router = useRouter();
  const { user, currentMess, userMesses, refreshMesses, setCurrentMess, isLoading } = useAuth();

  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [copied, setCopied] = useState(false);

  // Create Mess Form
  const [newName, setNewName] = useState("");
  const [newDistrict, setNewDistrict] = useState("Dhaka");
  const [newThana, setNewThana] = useState("");
  const [newArea, setNewArea] = useState("");
  const [creating, setCreating] = useState(false);

  // Join Mess Form
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const isManagerOrOwner =
    currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  const fetchMembers = async () => {
    if (!currentMess) return;
    setLoadingMembers(true);
    try {
      const res = await api.get(`/messes/${currentMess.id}/members`);
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (currentMess) {
      fetchMembers();
    }
  }, [user, currentMess, isLoading, router]);

  const handleCopyInvite = () => {
    if (!currentMess) return;
    navigator.clipboard.writeText(currentMess.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/messes", {
        name: newName,
        district: newDistrict,
        thana: newThana || null,
        area: newArea || null,
      });
      await refreshMesses();
      setCurrentMess(res.data);
      setNewName("");
      setNewThana("");
      setNewArea("");
      alert("নতুন মেস সফলভাবে তৈরি করা হয়েছে!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "মেস তৈরি করা সম্ভব হয়নি");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMess = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setJoinMsg(null);
    setJoinError(null);
    try {
      const res = await api.post(`/messes/join/${inviteCode.toUpperCase()}`);
      await refreshMesses();
      setCurrentMess(res.data);
      setJoinMsg("অভিনন্দন! মেসে সফলভাবে যুক্ত হয়েছেন।");
      setInviteCode("");
    } catch (err: any) {
      setJoinError(err.response?.data?.detail || "ইনভাইট কোড ভুল বা মেস খুঁজে পাওয়া যায়নি");
    } finally {
      setJoining(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!currentMess) return;
    try {
      await api.patch(`/messes/${currentMess.id}/members/${targetUserId}`, {
        role: newRole,
      });
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "রোল পরিবর্তন করা যায়নি");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" /> মেস সেটিংস ও মেম্বার ব্যবস্থাপনা
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              ইনভাইট কোড শেয়ার করুন, নতুন মেস খুলুন অথবা বন্ধুদের মেসে যোগ দিন
            </p>
          </div>
        </div>

        {/* Current Mess Invite Banner */}
        {currentMess && (
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                আপনার সক্রিয় মেস
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">{currentMess.name}</h2>
              <p className="text-emerald-100 text-sm mt-1">
                {currentMess.area ? `${currentMess.area}, ` : ""}
                {currentMess.thana ? `${currentMess.thana}, ` : ""}
                {currentMess.district || "বাংলাদেশ"}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <div className="text-[11px] font-semibold text-emerald-200 uppercase">
                  মেস ইনভাইট কোড
                </div>
                <div className="text-2xl font-mono font-black tracking-widest text-amber-300">
                  {currentMess.invite_code}
                </div>
              </div>
              <button
                onClick={handleCopyInvite}
                className="px-4 py-2 bg-white text-emerald-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow hover:bg-emerald-50 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "কপি হয়েছে!" : "কোড কপি করুন"}
              </button>
            </div>
          </div>
        )}

        {/* Member Management Section */}
        {currentMess && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> বর্তমান মেম্বার তালিকা ({members.length} জন)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  মেম্বারদের ভূমিকা ও সিট লেবেল নির্ধারণ করুন
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">নাম</th>
                    <th className="px-6 py-4">মোবাইল নম্বর</th>
                    <th className="px-6 py-4">ভূমিকা (Role)</th>
                    <th className="px-6 py-4">সিট</th>
                    {isManagerOrOwner && <th className="px-6 py-4 text-center">ম্যানেজ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.user_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {m.user_name}
                        {m.user_id === user?.id && (
                          <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            আপনি
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                        {m.phone}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold uppercase ${
                            m.role === "owner"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : m.role === "manager"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {m.role === "owner" ? "মালিক (Owner)" : m.role === "manager" ? "ম্যানেজার" : "সদস্য"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {m.seat_label || "নির্দিষ্ট নেই"}
                      </td>
                      {isManagerOrOwner && (
                        <td className="px-6 py-4 text-center">
                          {m.role !== "owner" && (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="member">সদস্য বানান</option>
                              <option value="manager">ম্যানেজার বানান</option>
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2-Column: Create New Mess & Join with Invite Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Create Mess */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" /> নতুন মেস তৈরি করুন
            </h2>
            <p className="text-xs text-slate-500">
              আপনি যদি মেস চালু বা পরিচালনা করতে চান, তবে এখানে মেসের নাম ও ঠিকানা দিন
            </p>

            <form onSubmit={handleCreateMess} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মেসের নাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ধানমন্ডি শান্তি নিবাস"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জেলা</label>
                  <input
                    type="text"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">থানা</label>
                  <input
                    type="text"
                    placeholder="যেমন: ধানমন্ডি"
                    value={newThana}
                    onChange={(e) => setNewThana(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">এলাকা / রোড নং</label>
                <input
                  type="text"
                  placeholder="যেমন: রোড নং ৪/এ, বাড়ি নং ১২"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {creating ? "তৈরি হচ্ছে..." : "নতুন মেস তৈরি করুন"}
              </button>
            </form>
          </div>

          {/* Card 2: Join with Code */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-600" /> ইনভাইট কোড দিয়ে মেসে যোগ দিন
            </h2>
            <p className="text-xs text-slate-500">
              আপনার মেস ম্যানেজার আপনাকে যে ৬ অক্ষরের কোড দিয়েছেন সেটি এখানে দিন
            </p>

            {joinMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{joinMsg}</span>
              </div>
            )}

            {joinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinMess} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ৬ অক্ষরের ইনভাইট কোড
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="যেমন: 28TQ2A"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-slate-50 text-lg font-mono font-bold tracking-widest text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                />
              </div>

              <button
                type="submit"
                disabled={joining || inviteCode.length < 4}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {joining ? "যাচাই হচ্ছে..." : "মেসে যোগ দিন"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
