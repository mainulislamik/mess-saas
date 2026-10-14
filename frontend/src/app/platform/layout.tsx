import React from "react";
import PlatformShell from "@/components/PlatformShell";

export const metadata = {
  title: "Super Admin Console — মেস ম্যানেজার বিডি",
  description: "সারা বাংলাদেশের মেস ও হোস্টেল সেন্ট্রালাইজড ম্যানেজমেন্ট প্ল্যাটফর্ম",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
