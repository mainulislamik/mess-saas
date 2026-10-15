"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  MessageSquare,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Sparkles,
} from "lucide-react";

export default function WhatsAppBotPage() {
  const { currentMess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groupJid, setGroupJid] = useState("120363041234567890@g.us");
  const [enableDigest, setEnableDigest] = useState(true);
  const [enableDues, setEnableDues] = useState(true);

  const [previewData, setPreviewData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  const fetchData = async () => {
    if (!currentMess) return;
    try {
      setLoading(true);
      const res = await api.get(`/messes/${currentMess.id}/whatsapp/config`);
      if (res.data) {
        setGroupJid(res.data.whatsapp_group_jid);
        setEnableDigest(res.data.enable_nightly_digest);
        setEnableDues(res.data.enable_dues_alerts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentMess) {
      fetchData();
    }
  }, [currentMess]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess) return;
    setError(null);
    setSaving(true);
    try {
      await api.put(`/messes/${currentMess.id}/whatsapp/config`, {
        whatsapp_group_jid: groupJid,
        enable_nightly_digest: enableDigest,
        enable_dues_alerts: enableDues,
      });
      alert("হোয়াটসঅ্যাপ কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!");
    } catch (err: any) {
      setError(err.response?.data?.detail || "সংরক্ষণ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const handleTestDigest = async () => {
    if (!currentMess) return;
    setTriggering(true);
    setPreviewData(null);
    try {
      const res = await api.post(`/messes/${currentMess.id}/whatsapp/trigger-nightly-digest`);
      setPreviewData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "টেস্ট ডাইজেস্ট পাঠানো যায়নি");
    } finally {
      setTriggering(false);
    }
  };

  if (!currentMess) return null;

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" /> অটোমেটেড হোয়াটসঅ্যাপ ডাইজেস্ট বট
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            প্রতিদিন রাত ১০টায় মেসের গ্রুপে অটো মিল কাউন্ট ও বাজার খরচের সারাংশ পাঠানোর Baileys/WhatsApp গেটওয়ে
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Bot className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">হোয়াটসঅ্যাপ বট কনফিগারেশন</h2>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                হোয়াটসঅ্যাপ গ্রুপ JID / নম্বর
              </label>
              <input
                type="text"
                value={groupJid}
                onChange={(e) => setGroupJid(e.target.value)}
                required
                placeholder="যেমন: 120363041234567890@g.us"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                যে হোয়াটসঅ্যাপ গ্রুপে বা চ্যাটে প্রতিদিন রাত ১০টায় মেসেজ যাবে তার সঠিক JID দিন।
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDigest}
                  onChange={(e) => setEnableDigest(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  প্রতিদিন রাত ১০টায় অটো নাইট ডাইজেস্ট (মিল ও বাজার সারাংশ) পাঠান
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDues}
                  onChange={(e) => setEnableDues(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  মেম্বারদের নেগেটিভ ব্যালেন্স বা বকেয়া পেমেন্ট রিমাইন্ডার অ্যালার্ট চালু রাখুন
                </span>
              </label>
            </div>

            {isManager && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestDigest}
                  disabled={triggering}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> {triggering ? "পাঠানো হচ্ছে..." : "টেস্ট ডাইজেস্ট পাঠান"}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {saving ? "সংরক্ষণ হচ্ছে..." : "কনফিগারেশন সেভ করুন"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Live Simulation & Preview */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">হোয়াটসঅ্যাপ মেসেজ প্রিভিউ ও গেটওয়ে স্ট্যাটাস</h2>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3 leading-relaxed shadow-inner">
            <div className="text-emerald-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Baileys Gateway Mock Output</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full">
                Online (:5001)
              </span>
            </div>
            {previewData ? (
              <div className="space-y-2 whitespace-pre-wrap">
                <div>📤 <span className="text-slate-400">Target JID:</span> {previewData.group_jid}</div>
                <div>📊 <span className="text-slate-400">Recipients:</span> {previewData.recipient_count} members</div>
                <div className="p-3 bg-slate-800 rounded-xl text-slate-200 mt-2 border border-slate-700">
                  {previewData.message_text}
                </div>
                <div className="text-emerald-400 font-bold pt-1">✅ Status: {previewData.status}</div>
              </div>
            ) : (
              <div className="text-slate-400 italic py-8 text-center">
                'টেস্ট ডাইজেস্ট পাঠান' বাটনে ক্লিক করে লাইভ হোয়াটসঅ্যাপ মেসেজ প্রিভিউ ও গেটওয়ে ট্র্যাকিং দেখতে পাবেন।
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
