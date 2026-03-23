// Phase 2: Subscribe checkout page — kept for future reactivation.
// Not linked from active navigation. The app now uses an on-demand model.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMXN } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DayPicker } from "@/components/booking/day-picker";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface PackageInfo {
  id: string;
  name: string;
  base_price: number;
  frequency: string;
  description: string | null;
}

interface CarRow {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  primary_location_id: string | null;
}

interface LocationRow {
  id: string;
  name: string;
}

const STEP_ICONS = [Car, MapPin, Calendar, CreditCard, CheckCircle2];
const STEP_LABELS = ["Auto", "Ubicacion", "Horario", "Pago", "Confirmar"];

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diario",
  twice_weekly: "2x semana",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  one_time: "Unico",
};

const DAY_LABELS: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mie",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sab",
  sunday: "Dom",
};

const PAYMENT_OPTIONS = [
  {
    provider: "stripe",
    label: "Tarjeta (Stripe)",
    description: "Visa, Mastercard, AMEX",
    icon: "💳",
  },
  {
    provider: "mercadopago",
    label: "MercadoPago",
    description: "Tarjeta, OXXO, SPEI",
    icon: "🏦",
  },
  {
    provider: "cash",
    label: "Efectivo",
    description: "Paga al lavador directamente",
    icon: "💵",
  },
] as const;

export default function SubscribeCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const packageId = params.packageId as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [pkg, setPkg] = useState<PackageInfo | null>(null);
  const [cars, setCars] = useState<CarRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);

  // Selections
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTimeStart, setPreferredTimeStart] = useState("08:00");
  const [preferredTimeEnd, setPreferredTimeEnd] = useState("12:00");
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [pkgRes, carsRes, locsRes] = await Promise.all([
        db
          .from("wash_packages")
          .select("id, name, base_price, frequency, description")
          .eq("id", packageId)
          .single(),
        db
          .from("cars")
          .select("id, plate_number, make, model, primary_location_id")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        db
          .from("locations")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (pkgRes.error || !pkgRes.data) {
        router.push("/packages");
        return;
      }

      setPkg(pkgRes.data as PackageInfo);
      setCars((carsRes.data || []) as CarRow[]);
      setLocations((locsRes.data || []) as LocationRow[]);
      setLoading(false);
    }

    if (!authLoading) fetchData();
  }, [user, authLoading, packageId]);

  // Auto-select location when car changes
  useEffect(() => {
    if (!selectedCarId) return;
    const car = cars.find((c) => c.id === selectedCarId);
    if (car?.primary_location_id) {
      setSelectedLocationId(car.primary_location_id);
    } else {
      setSelectedLocationId(null);
    }
  }, [selectedCarId, cars]);

  const selectedCar = cars.find((c) => c.id === selectedCarId);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedCarId;
      case 1:
        return !!selectedLocationId;
      case 2:
        return preferredDays.length > 0;
      case 3:
        return !!paymentProvider;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!user || !pkg) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: packageId,
          car_id: selectedCarId,
          location_id: selectedLocationId,
          payment_provider: paymentProvider,
          preferred_days: preferredDays,
          preferred_time_start: preferredTimeStart,
          preferred_time_end: preferredTimeEnd,
        }),
      });

      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        router.push("/subscriptions?success=true");
      }
    } catch {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!pkg) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/packages/${packageId}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Suscribirme</h1>
          <p className="text-sm text-muted-foreground">
            {pkg.name} &middot; {formatMXN(pkg.base_price)}/
            {FREQUENCY_LABELS[pkg.frequency]?.toLowerCase() || pkg.frequency}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px]",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 0: Select car */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selecciona tu auto</h2>
          {cars.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Car className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No tienes autos registrados.
                </p>
                <Link
                  href="/cars/new"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Agregar auto
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {cars.map((car) => (
                <Card
                  key={car.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedCarId === car.id
                      ? "ring-2 ring-primary"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedCarId(car.id)}
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    <Car className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{car.plate_number}</p>
                      {(car.make || car.model) && (
                        <p className="text-sm text-muted-foreground">
                          {[car.make, car.model].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </div>
                    {selectedCarId === car.id && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Location */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ubicacion</h2>
          {selectedCar?.primary_location_id ? (
            <Card className="ring-2 ring-primary">
              <CardContent className="flex items-center gap-3 py-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">
                    {selectedLocation?.name || "Ubicacion asignada"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ubicacion principal de tu auto
                  </p>
                </div>
                <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <Label>Selecciona una ubicacion</Label>
              <Select
                value={selectedLocationId || undefined}
                onValueChange={(v) => v && setSelectedLocationId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar ubicacion" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Schedule */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Preferencias de horario</h2>
          <div className="space-y-2">
            <Label>Dias preferidos</Label>
            <DayPicker selectedDays={preferredDays} onChange={setPreferredDays} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={preferredTimeStart}
                onChange={(e) => setPreferredTimeStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input
                type="time"
                value={preferredTimeEnd}
                onChange={(e) => setPreferredTimeEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Payment method */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Metodo de pago</h2>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <Card
                key={opt.provider}
                className={cn(
                  "cursor-pointer transition-colors",
                  paymentProvider === opt.provider
                    ? "ring-2 ring-primary"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setPaymentProvider(opt.provider)}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {opt.description}
                    </p>
                  </div>
                  {paymentProvider === opt.provider && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{pkg.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio</span>
                <span className="font-medium">
                  {formatMXN(pkg.base_price)}/
                  {FREQUENCY_LABELS[pkg.frequency]?.toLowerCase() || pkg.frequency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto</span>
                <span className="font-medium">
                  {selectedCar?.plate_number}{" "}
                  {selectedCar?.make && selectedCar?.model
                    ? `(${selectedCar.make} ${selectedCar.model})`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ubicacion</span>
                <span className="font-medium">
                  {selectedLocation?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dias</span>
                <span className="font-medium">
                  {preferredDays.map((d) => DAY_LABELS[d] || d).join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-medium">
                  {preferredTimeStart} - {preferredTimeEnd}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-medium">
                  {PAYMENT_OPTIONS.find((o) => o.provider === paymentProvider)
                    ?.label || paymentProvider}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atras
          </Button>
        )}
        {currentStep < 4 ? (
          <Button
            className="flex-1"
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar suscripcion
          </Button>
        )}
      </div>
    </div>
  );
}
