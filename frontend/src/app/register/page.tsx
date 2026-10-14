"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Utensils, Lock, Phone, User as UserIcon, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }

    setLoading(true);

    try {
      await register(name, phone, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "রেজিস্ট্রেশন ব্যর্থ হয়েছে। অন্য ফোন নম্বর দিয়ে চেষ্টা করুন।"
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
          ফ্রি একাউন্ট খুলুন
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          ১ মিনিটে নিজের মেস চালু করুন অথবা বন্ধুদের মেসে যোগ দিন
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                আপনার পুরো নাম
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ তামিম ইকবাল"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                মোবাইল নম্বর (+৮৮০)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
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
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {loading ? "একাউন্ট তৈরি হচ্ছে..." : "রেজিস্ট্রেশন সম্পন্ন করুন"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            আগে থেকেই একাউন্ট আছে?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              লগইন করুন
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
