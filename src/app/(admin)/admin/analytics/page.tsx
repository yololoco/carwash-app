"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, Users, Droplets, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    href: "/admin/analytics/revenue",
    title: "Ingresos",
    description: "Analisis de ingresos totales, suscripciones y pagos unicos.",
    icon: DollarSign,
  },
  {
    href: "/admin/analytics/customers",
    title: "Clientes",
    description:
      "Metricas de clientes, retención, satisfaccion y valor de vida.",
    icon: Users,
  },
  {
    href: "/admin/analytics/washers",
    title: "Lavadores",
    description:
      "Rendimiento de lavadores, calificaciones y eficiencia de materiales.",
    icon: Droplets,
  },
  {
    href: "/admin/analytics/costs",
    title: "Costos",
    description: "Margenes de utilidad, costos por lavado y analisis de gastos.",
    icon: TrendingDown,
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analiticas</h1>
      <p className="text-sm text-muted-foreground">
        Selecciona una seccion para ver reportes detallados.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.href}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <s.icon className="h-5 w-5 text-primary" />
                {s.title}
              </CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={s.href}
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                Ver detalle
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
