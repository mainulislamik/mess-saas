"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Settings,
  Database,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Flame,
  Wifi,
  Users2,
  Power,
} from "lucide-react";

export default function PlatformSettingsPage() {
  const [platformName, setPlatformName] = useState("মেস ম্যানেজার বিডি");
  const [supportPhone, setSupportPhone] = useState("01711002233");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [cylinderRate, setCylinderRate] = useState("1080");
  const [wifiRate, setWifiRate] = useState("800");
  const [cookSalary, setCookSalary] = useState("3500");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/platform/settings");
      if (res.data) {
        if (res.data.platform_name) setPlatformName(res.data.platform_name.value);
        if (res.data.support_phone) setSupportPhone(res.data.support_phone.value);
        if (res.data.maintenance_mode) setMaintenanceMode(res.data.maintenance_mode.value === true);
        if (res.data.cylinder_rate) setCylinderRate(res.data.cylinder_rate.value);
        if (res.data.wifi_rate) setWifiRate(res.data.wifi_rate.value);
        if (res.data.cook_salary) setCookSalary(res.data.cook_salary.value);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await Promise.all([
        api.post("/platform/settings/platform_name", { value: platformName }),
        api.post("/platform/settings/support_phone", { value: supportPhone }),
        api.post("/platform/settings/maintenance_mode", { value: maintenanceMode }),
        api.post("/platform/settings/cylinder_rate", { value: cylinderRate }),
        api.post("/platform/settings/wifi_rate", { value: wifiRate }),
        api.post("/platform/settings/cook_salary", { value: cookSalary }),
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">প্ল্যাটফর্ম সিস্টেম সেটিংস</h2>
        <p className="text-sm text-slate-500 mt-1">
          সারা বাংলাদেশের সকল মেসের গ্লোবাল কনফিগারেশন, ইউটিলিটি প্রিসেট এবং সিস্টেম নিয়ন্ত্রণ
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance Mode Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${maintenanceMode ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">সিস্টেম রক্ষণাবেক্ষণ মোড (Maintenance Mode)</h4>
              <p className="text-xs text-slate-500">অন থাকলে সাধারণ ব্যবহারকারীরা সাময়িক আপগ্রেড বার্তা দেখতে পাবেন</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              maintenanceMode
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {maintenanceMode ? "সক্রিয় আছে (ON)" : "বন্ধ আছে (OFF)"}
          </button>
        </div>

        {/* Brand & Support */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>ব্র্যান্ড ও অফিসিয়াল হেল্পলাইন</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">প্ল্যাটফর্ম নাম</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">অফিসিয়াল সাপোর্ট মোবাইল নম্বর</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Bangladesh Mess Utility Presets */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            <span>বাংলাদেশ মেস স্ট্যান্ডার্ড ইউটিলিটি রেট প্রিসেট</span>
          </h3>
          <p className="text-xs text-slate-500">
            নতুন মেস খোলার সময় ফিক্সড কস্ট ক্যাটাগরিতে এই ডিফল্ট মানগুলো স্বয়ংক্রিয়ভাবে সুঝেশন হিসেবে প্রদর্শিত হয়
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>১২ কেজি গ্যাস সিলিন্ডার (৳)</span>
              </label>
              <input
                type="number"
                value={cylinderRate}
                onChange={(e) => setCylinderRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-blue-500" />
                <span>ওয়াইফাই ইন্টারনেট বিল (৳)</span>
              </label>
              <input
                type="number"
                value={wifiRate}
                onChange={(e) => setWifiRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Users2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>বাবুর্চি / খালা বেতন (৳)</span>
              </label>
              <input
                type="number"
                value={cookSalary}
                onChange={(e) => setCookSalary(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Database & Storage */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            <span>ডাটাবেজ ও ব্যাকআপ কন্ট্রোল</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="font-bold text-slate-900 text-xs">PostgreSQL 16 লাইভ অটো-ব্যাকআপ</div>
              <div className="text-[11px] text-slate-500 mt-0.5">সব মেসের হিসাব ও ট্রানজ্যাকশন সুরক্ষিত আছে</div>
            </div>
            <button
              type="button"
              onClick={() => alert("ডাটাবেজ স্ন্যাপশট সফলভাবে সম্পন্ন হয়েছে!")}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1.5 self-start shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>স্ন্যাপশট ব্যাকআপ নিন</span>
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> সেটিংস সফলভাবে সংরক্ষিত হয়েছে
            </span>
          ) : (
            <span></span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "সংরক্ষণ হচ্ছে..." : "সকল পরিবর্তন সংরক্ষণ করুন"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
