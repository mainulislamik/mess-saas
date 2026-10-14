"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Utensils, Lock, Phone, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(phone.trim(), password);
      if (phone.trim().toUpperCase() === "IT") {
        router.push("/platform");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "লগইন ব্যর্থ হয়েছে। ফোন নম্বর/আইডি বা পাসওয়ার্ড যাচাই করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (p: string, pass: string) => {
    setPhone(p);
    setPassword(pass);
    setLoading(true);
    setError(null);
    try {
      await login(p, pass);
      if (p === "IT") {
        router.push("/platform");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || "লগইন ব্যর্থ হয়েছে। ফোন নম্বর/আইডি বা পাসওয়ার্ড যাচাই করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-200">
            <Utensils className="w-6 h-6" />
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          মেস ম্যানেজারে প্রবেশ করুন
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          আপনার মেসের খাতা-কলমহীন হিসাব সহজে পরিচালনা করুন
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                মোবাইল নম্বর / সুপার অ্যাডমিন আইডি
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="017XXXXXXXX অথবা IT"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                পাসওয়ার্ড
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? "প্রবেশ করা হচ্ছে..." : "লগইন করুন"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
              এক ক্লিকে লগইন টেস্ট করুন
            </p>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("01711002233", "password123")}
                  className="p-2.5 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all"
                >
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> মোঃ ইমোন
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">01711002233 (ম্যানেজার)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("01711002234", "password123")}
                  className="p-2.5 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all"
                >
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> তামিম ইকবাল
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">01711002234 (সদস্য)</div>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-slate-600">
            অ্যাকাউন্ট নেই?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              নতুন মেস বা মেম্বার রেজিস্ট্রেশন করুন
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
