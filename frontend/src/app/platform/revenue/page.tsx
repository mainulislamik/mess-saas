"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Building,
  Sparkles,
  Zap,
  ArrowRight,
  Send,
  HelpCircle,
} from "lucide-react";

export default function PlatformRevenuePage() {
  const [activeTab, setActiveTab] = useState("plans");

  const plans = [
    {
      name: "ফ্রি ব্যাচেলর টায়ার",
      price: "৳ ০",
      cycle: "আজীবন বিনামূল্যে",
      description: "ছোট ব্যাচেলর মেসের প্রাথমিক হিসাবের জন্য আদর্শ",
      features: [
        "সর্বোচ্চ ৪ জন মেম্বার সাপোর্ট",
        "দৈনিক মিল কাউন্ট ও মিল রেট",
        "বাজার ও মেম্বার ডিপোজিট হিসাব",
        "মাসিক ক্লোজিং স্টেটমেন্ট",
      ],
      popular: false,
      badge: "প্রাথমিক",
      color: "border-slate-200",
    },
    {
      name: "স্মার্ট মেস প্রিমিয়াম",
      price: "৳ ১৯৯",
      cycle: "প্রতি মাসে (মেস প্রতি)",
      description: "বাংলাদেশের মধ্যম ও বড় ব্যাচেলর মেসের জন্য সেরা পছন্দ",
      features: [
        "আনলিমিটেড মেম্বার অ্যাড করার সুবিধা",
        "বিকাশ / নগদ পেমেন্ট রেফারেন্স ট্র্যাকিং",
        "হোয়াটসঅ্যাপ মিল রিমাইন্ডার ও অ্যালার্ট",
        "অটোমেটিক মিল রেট ও বাকি-পাওনা ক্যালকুলেটর",
        "পিডিএফ সামারি ডাউনলোড সুবিধা",
      ],
      popular: true,
      badge: "সর্বাধিক জনপ্রিয়",
      color: "border-emerald-500 ring-2 ring-emerald-500/20",
    },
    {
      name: "হোস্টেল ও করপোরেট লিভিং",
      price: "৳ ৪৯৯",
      cycle: "প্রতি মাসে (হোস্টেল প্রতি)",
      description: "শিক্ষার্থী ও চাকরিজীবী ছাত্রাবাস/হোস্টেলের সম্পূর্ণ সমাধান",
      features: [
        "স্মার্ট মেসের সব সুযোগ-সুবিধা",
        "রুম ও সিট নম্বর ভিত্তিক পৃথক ট্র্যাকিং",
        "মাল্টি-ম্যানেজার ও শেফ অ্যাক্সেস",
        "অ্যাডভান্সড ফিক্সড কস্ট (বিদ্যুৎ, ওয়াইফাই, বাবুর্চি)",
        "ডেডিকেটেড ভিআইপি ফোন সাপোর্ট",
      ],
      popular: false,
      badge: "এন্টারপ্রাইজ",
      color: "border-purple-200",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS সাবস্ক্রিপশন ও রেভিনিউ</h2>
        <p className="text-sm text-slate-500 mt-1">
          সারা বাংলাদেশের মেসগুলোর জন্য ডিজাইনকৃত প্যাকেজ এবং বিকাশ/নগদ পেমেন্ট চ্যানেল
        </p>
      </div>

      {/* Revenue Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">মাসিক প্রত্যাশিত MRR</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">৳ ১,৩৯৩</div>
          <div className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> ৭টি মেসের প্রজেকশন
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">পেইড ও প্রিমিয়াম মেস</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">২ টি</div>
          <div className="text-xs text-slate-500 mt-2">স্ট্যান্ডার্ড ও এন্টারপ্রাইজ টিয়ার</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">অফিসিয়াল মার্চেন্ট চ্যানেল</div>
          <div className="text-lg font-bold text-slate-900 mt-2">bKash • Nagad</div>
          <div className="text-xs text-slate-500 mt-2">01711-002233 (ব্যক্তিগত/মার্চেন্ট)</div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div>
        <div className="mb-4">
          <h3 className="font-bold text-slate-900 text-lg">প্ল্যাটফর্ম প্যাকেজ কাঠামো</h3>
          <p className="text-xs text-slate-500">মেস ম্যানেজারদের জন্য উন্মুক্ত মূল্য তালিকা</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between relative ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{plan.badge}</div>
                <h4 className="text-xl font-extrabold text-slate-900 mt-1">{plan.name}</h4>
                <p className="text-xs text-slate-500 mt-2 min-h-[32px]">{plan.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500 font-medium">{plan.cycle}</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    plan.popular
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  কনফিগারেশন প্রয়োগ করুন
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
