"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export default function MaidGasRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/rent-utilities");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl animate-pulse">
        <Home className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">
        বাড়িভাড়া ও ইউটিলিটি বিল পেজে রিডাইরেক্ট হচ্ছে...
      </h2>
      <p className="text-xs text-slate-500">
        বুয়ার বেতন, গ্যাস সিলিন্ডার ও ইউটিলিটি বিল এখন &quot;বাড়িভাড়া ও ইউটিলিটি&quot; সেকশনে স্থানান্তরিত হয়েছে।
      </p>
    </div>
  );
}
