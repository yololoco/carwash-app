"use client";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LayoutDashboard, Calendar, Users, Boxes, UserCheck, Banknote } from "lucide-react";

const managerNav = [
  { href: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/schedule", label: "Agenda", icon: Calendar },
  { href: "/manager/staff", label: "Personal", icon: Users },
  { href: "/manager/inventory", label: "Inventario", icon: Boxes },
  { href: "/manager/customers", label: "Clientes", icon: UserCheck },
  { href: "/manager/cuotas", label: "Cuotas", icon: Banknote },
];

export default function ManagerLayout({
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
      <MobileNav items={managerNav} />
    </div>
  );
}
