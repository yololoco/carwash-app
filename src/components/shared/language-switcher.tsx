"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = async () => {
    const newLocale = locale === "es" ? "en" : "es";

    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      className="inline-flex items-center rounded-full border border-border bg-muted/50 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
      aria-label="Switch language"
    >
      <span
        className={`px-2 py-1 rounded-full transition-colors ${
          locale === "es"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground"
        }`}
      >
        ES
      </span>
      <span
        className={`px-2 py-1 rounded-full transition-colors ${
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground"
        }`}
      >
        EN
      </span>
    </button>
  );
}
