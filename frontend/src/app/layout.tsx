import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "মেস ম্যানেজার বিডি — ব্যাচেলর মেস ম্যানেজমেন্ট SaaS",
  description: "বাংলাদেশের ব্যাচেলর মেসের খাতা-কলম মুক্ত স্বয়ংক্রিয় মিল, বাজার, ফিক্সড বিল ও মাস সমাপনী সফটওয়্যার।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
