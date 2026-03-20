"use client";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ClipboardList, BarChart3, Calendar, User } from "lucide-react";

const washerNav = [
  { href: "/washer/queue", label: "Cola", icon: ClipboardList },
  { href: "/washer/schedule", label: "Agenda", icon: Calendar },
  { href: "/washer/performance", label: "Mi rendimiento", icon: BarChart3 },
  { href: "/washer/profile", label: "Perfil", icon: User },
];

export default function WasherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pb-6">
        {children}
      </main>
      <MobileNav items={washerNav} />
    </div>
  );
}
