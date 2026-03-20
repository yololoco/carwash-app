"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMXN } from "@/lib/utils/currency";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
}

interface PackageDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  frequency: string | null;
  is_active: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  one_time: "Unico",
};

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params.id as string;

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPackage() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      const { data: pkgData, error } = await db
        .from("wash_packages")
        .select("id, name, description, price, frequency, is_active")
        .eq("id", packageId)
        .single();

      if (error || !pkgData) {
        router.push("/packages");
        return;
      }

      setPkg(pkgData as PackageDetail);

      // Fetch included services through the junction table
      const { data: serviceLinks } = await db
        .from("package_services")
        .select("service_id, service_catalog(id, name, description, duration_minutes)")
        .eq("package_id", packageId);

      const mappedServices = ((serviceLinks || []) as any[]).map(
        (link: any) => ({
          id: link.service_catalog?.id || link.service_id,
          name: link.service_catalog?.name || "Servicio",
          description: link.service_catalog?.description || null,
          duration_minutes: link.service_catalog?.duration_minutes || null,
        })
      );

      setServices(mappedServices);
      setLoading(false);
    }

    fetchPackage();
  }, [packageId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pkg) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/packages"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">{pkg.name}</h1>
      </div>

      {/* Package Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>{pkg.name}</CardTitle>
            </div>
            {pkg.frequency && (
              <Badge variant="secondary">
                {FREQUENCY_LABELS[pkg.frequency] || pkg.frequency}
              </Badge>
            )}
          </div>
          {pkg.description && (
            <CardDescription className="mt-2">
              {pkg.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{formatMXN(pkg.price)}</span>
            {pkg.frequency && pkg.frequency !== "one_time" && (
              <span className="text-sm text-muted-foreground">
                /{FREQUENCY_LABELS[pkg.frequency]?.toLowerCase() || pkg.frequency}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Included Services */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Servicios incluidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={service.id}>
                  {index > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                      {service.duration_minutes && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscribe Button */}
      <Link
        href={`/subscribe/${pkg.id}`}
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        Suscribirme
      </Link>
    </div>
  );
}
