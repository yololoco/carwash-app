"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plus, Building2, Home, Users, ChevronRight } from "lucide-react";
import type { Location } from "@/types/database";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });
      setLocations((data || []) as Location[]);
      setLoading(false);
    }
    fetchLocations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ubicaciones</h1>
          <p className="text-muted-foreground">
            Administra los edificios donde opera myWash.
          </p>
        </div>
        <Link
          href="/admin/locations/new"
          className={buttonVariants()}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva ubicacion
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay ubicaciones registradas.</p>
            <Link
              href="/admin/locations/new"
              className={buttonVariants({ variant: "outline" })}
            >
              Crear primera ubicacion
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/admin/locations/${location.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {location.location_type === "office_building" ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Home className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{location.name}</p>
                      <Badge
                        variant={location.is_active ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {location.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {location.address}, {location.city}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {location.location_type === "office_building"
                          ? "Oficinas"
                          : "Residencial"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Cap: {location.max_daily_capacity}/dia
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
