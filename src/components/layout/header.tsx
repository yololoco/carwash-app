"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Droplets, LayoutDashboard, Shield, Wrench } from "lucide-react";

export function Header() {
  const { profile } = useAuth();
  const role = profile?.role;

  return (
    <header className="sticky top-0 z-50 border-b border-[#0099CC]/6 bg-gradient-to-r from-white/95 via-[#F8FDFF]/95 to-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-[#0099CC]" />
          <span className="text-lg font-bold">
            my<span className="text-[#0099CC]">Wash</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Role-based quick access */}
          {role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full bg-[#0099CC]/8 px-3 py-1.5 text-xs font-semibold text-[#0099CC] transition-colors hover:bg-[#0099CC]/15"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {role === "location_manager" && (
            <Link
              href="/manager/dashboard"
              className="flex items-center gap-1.5 rounded-full bg-[#0099CC]/8 px-3 py-1.5 text-xs font-semibold text-[#0099CC] transition-colors hover:bg-[#0099CC]/15"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manager</span>
            </Link>
          )}
          {role === "car_washer" && (
            <Link
              href="/washer/queue"
              className="flex items-center gap-1.5 rounded-full bg-[#0099CC]/8 px-3 py-1.5 text-xs font-semibold text-[#0099CC] transition-colors hover:bg-[#0099CC]/15"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lavador</span>
            </Link>
          )}

          <LanguageSwitcher />
          <NotificationBell />
          <UserButton
            signInUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
