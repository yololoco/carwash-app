"use client";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Bell, CalendarCheck, DollarSign, User } from "lucide-react";

const washerNav = [
  { href: "/washer/requests", label: "Solicitudes", icon: Bell },
  { href: "/washer/today", label: "Mi dia", icon: CalendarCheck },
  { href: "/washer/earnings", label: "Ganancias", icon: DollarSign },
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
