"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Droplets, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Droplets className="h-16 w-16 text-[var(--color-brand-cyan)]" />
      <div>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">
          Esta pagina no existe o fue movida.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al inicio
      </Link>
    </div>
  );
}
