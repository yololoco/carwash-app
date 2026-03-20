"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Droplets, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-[#F0FAFF] via-white to-[#F5FBFF]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,#B8E6FF_0%,transparent_70%)] opacity-30" />
      </div>
      <Card className="relative w-full max-w-md glow-sm border-[#E0F0FA]">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto flex items-center gap-2">
            <Droplets className="h-7 w-7 text-[#0099CC]" />
            <span className="text-xl font-bold">my<span className="text-[#0099CC]">Wash</span></span>
          </Link>
          <CardTitle className="mt-4 text-2xl">Recuperar acceso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Puedes iniciar sesion con tu cuenta de Google o solicitar un enlace de acceso por correo desde la pantalla de inicio de sesion.
          </p>
          <Link href="/sign-in" className={buttonVariants({ className: "w-full" })}>
            Ir a iniciar sesion
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" />
            Volver al inicio
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
