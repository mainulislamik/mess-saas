import Link from "next/link";
import { Utensils, ShoppingBag, Receipt, Users, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-200">
              ম
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900">মেস ম্যানেজার</span>
              <span className="text-xs ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                BD SaaS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-emerald-600 px-3 py-2"
            >
              লগইন
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition"
            >
              মেস শুরু করুন
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          বাংলাদেশের ব্যাচেলর মেসগুলোর খাতা-কলম মুক্ত সমাধান
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
          মেসের মিল, বাজার আর ভাড়ার হিসাব <br className="hidden sm:block" />
          <span className="text-emerald-600">১ ক্লিকে নির্ভুল ক্লোজিং</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          খাতায় মিল রেট মিলছে না? মাস শেষে ভাড়ার ভাগাভাগি নিয়ে ঝামেলা? 
          মেস ম্যানেজার বিডি দিয়ে মিল অন/অফ, বাজার এন্ট্রি, ফিক্সড কস্ট আর বিকাশ/নগদ জমা ট্র্যাক করুন নিমেষেই।
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition"
          >
            ফ্রি মেস খুলুন <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center text-base font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 px-6 py-3.5 rounded-xl transition"
          >
            ফিচারসমূহ দেখুন
          </a>
        </div>
      </section>

      {/* Live Formula Preview Box */}
      <section className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
            অটো মিল রেট ক্যালকুলেশন ইঞ্জিন
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">মোট বাজার খরচ</div>
              <div className="text-xl font-bold text-slate-800">৳ ১৮,৫০০</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">মোট মিল সংখ্যা</div>
              <div className="text-xl font-bold text-slate-800">৩২০ টি</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-xs text-emerald-700 font-medium">লাইভ মিল রেট</div>
              <div className="text-2xl font-black text-emerald-700">৳ ৫৭.৮১</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">মাসিক ক্লোজিং</div>
              <div className="text-sm font-semibold text-emerald-600 mt-1">✓ স্বয়ংক্রিয় ব্যালেন্স</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-10">
          মেস পরিচালনার সব টুলস এক ছাতার নিচে
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-400 transition shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">স্মার্ট মিল কাউন্টিং</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              সকাল ০.৫, দুপুর ১, রাত ১। বাড়ি যাওয়ার আগে নিজেই মিল OFF করে দিন, আর কোনো ভুল হিসাবের অভিযোগ থাকবে না।
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-400 transition shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">দৈনিক বাজার ও রসিদ</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              কে বাজার করলো, মোট কত খরচ হলো এবং রসিদের ছবি আপলোড করে এন্ট্রি দিন। ম্যানেজার সাথে সাথে অনুমোদন করবেন।
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-400 transition shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ফিক্সড কস্ট স্প্লিট</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              বাড়ি ভাড়া, গ্যাস (১০৮০৳), পানি, বিদ্যুৎ, ওয়াইফাই এবং খালা বিল সবার মাঝে স্বয়ংক্রিয়ভাবে সমান ভাগে ভাগ হবে।
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            আজই আপনার মেসকে ডিজিটালাইজ করুন
          </h2>
          <p className="text-emerald-100 max-w-xl mx-auto mb-6 text-sm sm:text-base">
            ১ম মেস সম্পূর্ণ ফ্রি — আজীবন ৮ জন মেম্বার পর্যন্ত কোনো চার্জ নেই!
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-emerald-800 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-slate-100 transition"
          >
            মেস তৈরি করুন (সম্পূর্ণ ফ্রি)
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8 text-center text-xs text-slate-500">
        <p>© 2026 মেস ম্যানেজার বিডি (MessManager BD) — বাংলাদেশে গর্বের সাথে তৈরি।</p>
      </footer>
    </div>
  );
}
