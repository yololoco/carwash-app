"use client";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Home, Car, Repeat, ClipboardList, User } from "lucide-react";

const customerNav = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/cars", label: "Autos", icon: Car },
  { href: "/subscriptions", label: "Mis planes", icon: Repeat },
  { href: "/packages", label: "Planes", icon: ClipboardList },
  { href: "/profile", label: "Perfil", icon: User },
];

export default function CustomerLayout({
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
      <MobileNav items={customerNav} />
    </div>
  );
}
