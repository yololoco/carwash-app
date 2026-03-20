"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import {
  LayoutDashboard,
  MapPin,
  Users,
  UserCheck,
  Wrench,
  Package,
  BarChart3,
  Boxes,
  Building2,
  Settings,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Download,
  ScrollText,
} from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/locations", label: "Ubicaciones", icon: MapPin },
  { href: "/admin/staff", label: "Personal", icon: Users },
  { href: "/admin/customers", label: "Clientes", icon: UserCheck },
  { href: "/admin/services", label: "Servicios", icon: Wrench },
  { href: "/admin/packages", label: "Planes", icon: Package },
  { href: "/admin/fees", label: "Cargos", icon: DollarSign },
  { href: "/admin/analytics", label: "Analiticas", icon: BarChart3 },
  { href: "/admin/inventory", label: "Inventario", icon: Boxes },
  { href: "/admin/subscriptions", label: "Suscripciones", icon: ClipboardList },
  { href: "/admin/disputes", label: "Disputas", icon: AlertTriangle },
  { href: "/admin/corporate", label: "Corporativo", icon: Building2 },
  { href: "/admin/settings", label: "Configuracion", icon: Settings },
  { href: "/admin/exports", label: "Exportes", icon: Download },
  { href: "/admin/audit", label: "Auditoria", icon: ScrollText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-7xl">
        {/* Desktop Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r sm:block">
          <nav className="sticky top-14 space-y-1 p-4">
            {adminLinks.map((link) => {
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
