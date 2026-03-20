"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, Calendar, Boxes } from "lucide-react";

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard del Manager</h1>
        <p className="text-muted-foreground">
          Vista general de tu ubicacion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Lavados hoy", value: "0", icon: Car },
          { title: "Personal activo", value: "0", icon: Users },
          { title: "Citas programadas", value: "0", icon: Calendar },
          { title: "Alertas de inventario", value: "0", icon: Boxes },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
