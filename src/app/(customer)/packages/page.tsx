"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMXN } from "@/lib/utils/currency";
import { Droplets, Sparkles, ArrowRight } from "lucide-react";

interface WashPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  frequency: string | null;
  is_active: boolean;
  included_services_count: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  one_time: "Unico",
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<WashPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPackages() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("wash_packages")
        .select("id, name, description, price, frequency, is_active, package_services(count)")
        .eq("is_active", true)
        .order("price", { ascending: true });

      const mapped = ((data || []) as any[]).map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        frequency: pkg.frequency,
        is_active: pkg.is_active,
        included_services_count:
          pkg.package_services?.[0]?.count ?? 0,
      }));

      setPackages(mapped);
      setLoading(false);
    }
    fetchPackages();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planes de lavado</h1>
        <p className="text-muted-foreground">
          Elige el plan que mejor se adapte a tus necesidades.
        </p>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Droplets className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay planes disponibles por el momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <Link key={pkg.id} href={`/packages/${pkg.id}`} className="block">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{pkg.name}</CardTitle>
                    </div>
                    {pkg.frequency && (
                      <Badge variant="secondary">
                        {FREQUENCY_LABELS[pkg.frequency] || pkg.frequency}
                      </Badge>
                    )}
                  </div>
                  {pkg.description && (
                    <CardDescription className="line-clamp-2">
                      {pkg.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {formatMXN(pkg.price)}
                    </span>
                    {pkg.frequency && pkg.frequency !== "one_time" && (
                      <span className="text-sm text-muted-foreground">
                        /{FREQUENCY_LABELS[pkg.frequency]?.toLowerCase() || pkg.frequency}
                      </span>
                    )}
                  </div>
                  {pkg.included_services_count > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pkg.included_services_count}{" "}
                      {pkg.included_services_count === 1
                        ? "servicio incluido"
                        : "servicios incluidos"}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <span className="flex items-center gap-1 text-sm text-primary">
                    Ver detalles
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
