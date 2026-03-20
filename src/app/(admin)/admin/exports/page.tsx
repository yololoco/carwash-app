"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Download, DollarSign, Users, Droplets } from "lucide-react";

interface ExportConfig {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const exports: ExportConfig[] = [
  {
    type: "revenue",
    title: "Ingresos",
    description: "Exportar datos de ingresos, pagos y suscripciones.",
    icon: DollarSign,
  },
  {
    type: "customers",
    title: "Clientes",
    description: "Exportar lista de clientes con gasto total y suscripciones.",
    icon: Users,
  },
  {
    type: "washers",
    title: "Lavadores",
    description:
      "Exportar rendimiento de lavadores, calificaciones y metricas.",
    icon: Droplets,
  },
];

function ExportCard({ config }: { config: ExportConfig }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleDownload() {
    const params = new URLSearchParams({ type: config.type });
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    window.open(`/api/exports?${params.toString()}`, "_blank");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <config.icon className="h-5 w-5 text-primary" />
          {config.title}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor={`${config.type}-start`}>Desde</Label>
            <Input
              id={`${config.type}-start`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${config.type}-end`}>Hasta</Label>
            <Input
              id={`${config.type}-end`}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleDownload}>
          <Download className="mr-1 h-4 w-4" />
          Descargar CSV
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ExportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Exportes</h1>
      <p className="text-sm text-muted-foreground">
        Descarga reportes en formato CSV para el rango de fechas deseado.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((config) => (
          <ExportCard key={config.type} config={config} />
        ))}
      </div>
    </div>
  );
}
