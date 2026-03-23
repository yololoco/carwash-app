"use client";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Home, Car, Droplets, User } from "lucide-react";

const customerNav = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/cars", label: "Mis autos", icon: Car },
  { href: "/bookings", label: "Lavados", icon: Droplets },
  { href: "/profile", label: "Perfil", icon: User },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pb-6">
        {children}
      </main>
      <MobileNav items={customerNav} />
    </div>
  );
}
