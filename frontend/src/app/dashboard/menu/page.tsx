"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Utensils,
  Calendar,
  CheckCircle2,
  Plus,
  Sparkles,
  Award,
  Vote,
  AlertCircle,
  BookOpen,
} from "lucide-react";

export default function MenuVotingPage() {
  const { currentMess } = useAuth();
  const [routine, setRoutine] = useState<any>(null);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [routineText, setRoutineText] = useState("");

  // New Poll Modal
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [options, setOptions] = useState([
    { option_text: "", bazar_suggestion: "" },
    { option_text: "", bazar_suggestion: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentMess?.my_role === "owner" || currentMess?.my_role === "manager";

  const fetchData = async () => {
    if (!currentMess) return;
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([
        api.get(`/messes/${currentMess.id}/meal-polls/routine`),
        api.get(`/messes/${currentMess.id}/meal-polls`),
      ]);
      setRoutine(rRes.data);
      try {
        setRoutineText(JSON.stringify(JSON.parse(rRes.data.schedule_json), null, 2));
      } catch {
        setRoutineText(rRes.data.schedule_json);
      }
      setPolls(pRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentMess) {
      fetchData();
      const today = new Date().toISOString().split("T")[0];
      setTargetDate(today);
    }
  }, [currentMess]);

  const handleSaveRoutine = async () => {
    if (!currentMess) return;
    try {
      JSON.parse(routineText); // Validate JSON
      await api.put(`/messes/${currentMess.id}/meal-polls/routine`, {
        schedule_json: routineText,
      });
      setEditingRoutine(false);
      fetchData();
      alert("সাপ্তাহিক রুটিন সফলভাবে আপডেট করা হয়েছে!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "সঠিক JSON ফরমেটে রুটিন লিখুন");
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!currentMess) return;
    try {
      await api.post(`/messes/${currentMess.id}/meal-polls/${pollId}/vote`, {
        option_id: optionId,
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "ভোট প্রদান করা যায়নি");
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMess) return;
    setError(null);
    setSubmitting(true);
    try {
      const validOptions = options.filter((o) => o.option_text.trim() !== "");
      if (validOptions.length < 2) {
        throw new Error("কমপক্ষে দুটি অপশন দিতে হবে");
      }
      await api.post(`/messes/${currentMess.id}/meal-polls`, {
        title: pollTitle,
        target_date: targetDate,
        options: validOptions,
      });
      setShowPollModal(false);
      setPollTitle("");
      setOptions([
        { option_text: "", bazar_suggestion: "" },
        { option_text: "", bazar_suggestion: "" },
      ]);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "পোল তৈরি করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentMess) return null;

  let scheduleObj: any = {};
  try {
    scheduleObj = routine ? JSON.parse(routine.schedule_json) : {};
  } catch {
    scheduleObj = {};
  }

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-emerald-600" /> খাবারের মেন্যু ও স্পেশাল ভোজ ভোট
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            সাপ্তাহিক রুটিন এবং ছুটির দিনের স্পেশাল খাবারের মেন্যু নির্ধারণ ও ভোটিং ইঞ্জিন
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowPollModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> নতুন পোল / মেন্যু ভোট তৈরি করুন
          </button>
        )}
      </div>

      {/* Weekly Routine Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">মেসের সাপ্তাহিক খাবারের রুটিন</h2>
          </div>
          {isManager && (
            <button
              onClick={() => setEditingRoutine(!editingRoutine)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              {editingRoutine ? "বাতিল" : "রুটিন এডিট করুন"}
            </button>
          )}
        </div>

        {editingRoutine ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              নিচের JSON ফরমেটে ৭ দিনের রুটিন সম্পাদনা করুন:
            </p>
            <textarea
              rows={12}
              value={routineText}
              onChange={(e) => setRoutineText(e.target.value)}
              className="w-full font-mono text-xs p-4 bg-slate-900 text-emerald-400 rounded-2xl focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingRoutine(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveRoutine}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow"
              >
                রুটিন সংরক্ষণ করুন
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(scheduleObj).map(([key, val]: [string, any]) => (
              <div
                key={key}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 hover:border-emerald-200 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-emerald-700">
                    {val.day_bn || key}
                  </span>
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-xs space-y-1 text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-500">সকাল:</span> {val.breakfast}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">দুপুর:</span> {val.lunch}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">রাত:</span> {val.dinner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekend Feast Polls Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">ছুটির দিন ও স্পেশাল ভোজ মেন্যু ভোটিং</h2>
        </div>

        {polls.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-sm">
            বর্তমানে কোনো সক্রিয় মেন্যু ভোট নেই। ম্যানেজার নতুন পোল তৈরি করতে পারেন।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                      তারিখ: {poll.target_date}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      মোট ভোট: {poll.total_votes} টি
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{poll.title}</h3>
                  <p className="text-xs text-slate-500">সৃষ্টিকারী: {poll.created_by_name}</p>
                </div>

                {/* Winning Option Highlight */}
                {poll.winning_option && poll.total_votes > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <div>
                      <Award className="w-5 h-5 text-amber-600 mt-0.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-900">এ পর্যন্ত এগিয়ে থাকা মেন্যু:</div>
                      <div className="text-sm font-extrabold text-amber-950 mt-0.5">
                        {poll.winning_option.option_text} ({poll.winning_option.vote_count} ভোট)
                      </div>
                      {poll.winning_option.bazar_suggestion && (
                        <div className="text-[11px] text-amber-800 mt-1 bg-amber-100/60 p-2 rounded-xl">
                          🛒 <span className="font-semibold">বাজার পরামর্শ:</span>{" "}
                          {poll.winning_option.bazar_suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-2.5">
                  {poll.options.map((opt: any) => {
                    const isMyVote = poll.user_voted_option_id === opt.id;
                    const percentage =
                      poll.total_votes > 0
                        ? Math.round((opt.vote_count / poll.total_votes) * 100)
                        : 0;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleVote(poll.id, opt.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                          isMyVote
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-100/40 -z-0 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {isMyVote && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                              {opt.option_text}
                            </div>
                            {opt.bazar_suggestion && (
                              <div className="text-[11px] text-slate-500">
                                💡 {opt.bazar_suggestion}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-extrabold text-slate-800">
                              {opt.vote_count} ভোট
                            </div>
                            <div className="text-[10px] text-slate-400">{percentage}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <h2 className="text-xl font-bold text-slate-900">নতুন মেন্যু ভোটিং পোল তৈরি করুন</h2>
            <p className="text-xs text-slate-500">
              শুক্রবার বা বিশেষ দিনের খাবারের অপশন দিন এবং মেম্বররা ভোট দিয়ে পছন্দের মেন্যু বেছে নেবে।
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পোলের শিরোনাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: শুক্রবার দুপুরের স্পেশাল ভোজ"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ভোজের তারিখ
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  খাবারের অপশন ও বাজার পরামর্শ
                </label>
                {options.map((opt, idx) => (
                  <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <input
                      type="text"
                      placeholder={`অপশন ${idx + 1} (যেমন: বিফ তেহারি)`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx].option_text = e.target.value;
                        setOptions(newOpts);
                      }}
                      required={idx < 2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="বাজারের উপাদানের তালিকা (যেমন: গরুর মাংস ৪ কেজি, চাল ৪ কেজি)"
                      value={opt.bazar_suggestion}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx].bazar_suggestion = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-[11px] text-slate-700 focus:outline-none"
                    />
                  </div>
                ))}
                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, { option_text: "", bazar_suggestion: "" }])}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    + আরেকটি অপশন যোগ করুন
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition disabled:opacity-50"
                >
                  {submitting ? "তৈরি হচ্ছে..." : "পোল পাবলিশ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
