"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Bell,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Megaphone,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  priority: string;
  created_at: string;
}

export default function PlatformAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/platform/announcements");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    try {
      setSaving(true);
      await api.post("/platform/announcements", {
        title,
        message,
        priority,
        is_active: true,
      });
      setTitle("");
      setMessage("");
      setShowModal(false);
      await fetchItems();
    } catch (err) {
      alert("বিজ্ঞপ্তি প্রকাশ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি এই বিজ্ঞপ্তিটি মুছে ফেলতে চান?")) return;
    try {
      await api.delete(`/platform/announcements/${id}`);
      await fetchItems();
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">নোটিশ ও জরুরি ব্রডকাস্ট</h2>
          <p className="text-sm text-slate-500 mt-1">
            সারা বাংলাদেশের সকল মেসের মেম্বার ও ম্যানেজারদের জন্য গ্লোবাল ব্যানার বিজ্ঞপ্তি
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন বিজ্ঞপ্তি পাঠান</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            বিজ্ঞপ্তি তালিকা লোড হচ্ছে...
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-2 p-8 bg-white border border-slate-200 rounded-2xl text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-900 text-sm">কোনো সক্রিয় বিজ্ঞপ্তি নেই</h3>
            <p className="text-xs text-slate-500 mt-1">
              যেকোনো জরুরি নোটিশ পোস্ট করলে তা ব্যবহারকারীদের ড্যাশবোর্ডের শীর্ষে প্রদর্শিত হবে।
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-5 bg-white rounded-2xl border shadow-sm flex flex-col justify-between ${
                item.priority === "urgent" ? "border-amber-400 ring-1 ring-amber-400/20" : "border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.priority === "urgent"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.priority === "urgent" ? "জরুরি ঘোষণা" : "সাধারণ নোটিশ"}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">{item.message}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>প্রকাশকাল: {new Date(item.created_at).toLocaleDateString("bn-BD")}</span>
                <span className="text-emerald-700 font-medium">সক্রিয়</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-1">নতুন গ্লোবাল বিজ্ঞপ্তি তৈরি করুন</h3>
            <p className="text-xs text-slate-500 mb-4">
              এটি সব মেসের সকল মেম্বারের হোম ড্যাশবোর্ডে ভেসে উঠবে।
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শিরোনাম</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: রমজান উপলক্ষে মিল তালিকা ও বাজার শিডিউল"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">অগ্রাধিকার লেভেল</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="normal">সাধারণ তথ্য</option>
                  <option value="urgent">জরুরি সতর্কতা (হলুদ ব্যানার)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিস্তারিত বার্তা</label>
                <textarea
                  rows={4}
                  required
                  placeholder="বিজ্ঞপ্তির মূল বার্তা এখানে লিখুন..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all"
                >
                  {saving ? "প্রকাশ হচ্ছে..." : "বিজ্ঞপ্তি প্রকাশ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
