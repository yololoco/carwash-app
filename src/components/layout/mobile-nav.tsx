"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0099CC]/6 bg-gradient-to-t from-white via-[#FAFEFF] to-white/95 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-around px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-medium transition-all",
                isActive
                  ? "text-[#0099CC] scale-105"
                  : "text-[#1A2B3C]/35 hover:text-[#1A2B3C]/60"
              )}
            >
              <div className={cn(
                "rounded-lg p-1.5 transition-colors",
                isActive ? "bg-[#0099CC]/8" : ""
              )}>
                <item.icon className="h-[18px] w-[18px]" />
              </div>
              <span className="max-w-[56px] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
