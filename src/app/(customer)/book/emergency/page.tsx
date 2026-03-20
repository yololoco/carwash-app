"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMXN } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Car,
  MapPin,
  CreditCard,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";

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

const STEP_LABELS = ["Auto", "Ubicacion", "Precio", "Pago", "Confirmar"];

export default function EmergencyBookingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [cars, setCars] = useState<CarRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [baseWashPrice, setBaseWashPrice] = useState(0);
  const [emergencyFee, setEmergencyFee] = useState(0);

  // Selections
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [carsRes, locsRes, feesRes, washRes] = await Promise.all([
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
        db
          .from("premium_fees")
          .select("name, fee_type, amount, percentage")
          .eq("fee_type", "emergency")
          .limit(1),
        db
          .from("service_catalog")
          .select("base_price")
          .eq("category", "wash")
          .eq("is_active", true)
          .order("base_price", { ascending: true })
          .limit(1),
      ]);

      setCars((carsRes.data || []) as CarRow[]);
      setLocations((locsRes.data || []) as LocationRow[]);

      const fee = feesRes.data?.[0];
      if (fee) {
        setEmergencyFee(fee.amount ?? 0);
      }

      const wash = washRes.data?.[0];
      if (wash) {
        setBaseWashPrice(wash.base_price ?? 0);
      }

      setLoading(false);
    }

    if (!authLoading) fetchData();
  }, [user, authLoading]);

  // Auto-select location
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
  const totalPrice = baseWashPrice + emergencyFee;

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedCarId;
      case 1:
        return !!selectedLocationId;
      case 2:
        return true;
      case 3:
        return !!paymentProvider;
      default:
        return true;
    }
  };

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);

    try {
      const now = new Date();
      const scheduledDate = now.toISOString().split("T")[0];
      const hour = now.getHours();
      const scheduledTimeStart = `${String(hour).padStart(2, "0")}:00`;
      const scheduledTimeEnd = `${String(hour + 1).padStart(2, "0")}:00`;

      const { data: booking, error: bookingError } = await db
        .from("bookings")
        .insert({
          customer_id: user.id,
          car_id: selectedCarId,
          location_id: selectedLocationId,
          scheduled_date: scheduledDate,
          scheduled_time_start: scheduledTimeStart,
          scheduled_time_end: scheduledTimeEnd,
          is_one_time: true,
          is_emergency: true,
          priority_score: 10000,
          status: "pending",
          total_price: totalPrice,
        })
        .select("id")
        .single();

      if (bookingError || !booking) throw bookingError;

      await db.from("payments").insert({
        booking_id: booking.id,
        customer_id: user.id,
        amount: totalPrice,
        payment_provider: paymentProvider,
        status: paymentProvider === "cash" ? "pending" : "processing",
      });

      router.push("/bookings");
    } catch (err) {
      console.error("Error al crear reservacion de emergencia:", err);
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Lavado de emergencia</h1>
          <p className="text-sm text-muted-foreground">
            Prioridad maxima, lo antes posible
          </p>
        </div>
      </div>

      {/* Emergency banner */}
      <Card className="border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
        <CardContent className="flex items-center gap-3 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
          <p className="text-sm text-orange-800 dark:text-orange-300">
            Los lavados de emergencia tienen un cargo adicional y se asignan
            con la mayor prioridad disponible.
          </p>
        </CardContent>
      </Card>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
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
                  i + 1
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

      {/* Step 2: Emergency price */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Precio de emergencia</h2>
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lavado base</span>
                <span className="font-medium">{formatMXN(baseWashPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3 text-orange-500" />
                  Cargo de emergencia
                </span>
                <span className="font-medium text-orange-600">
                  + {formatMXN(emergencyFee)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatMXN(totalPrice)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Payment */}
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

      {/* Step 4: Confirm */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <Card>
            <CardContent className="space-y-3 py-4">
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
                <span className="text-muted-foreground">Tipo</span>
                <span className="flex items-center gap-1 font-medium text-orange-600">
                  <Zap className="h-3 w-3" />
                  Emergencia
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-medium">
                  {PAYMENT_OPTIONS.find((o) => o.provider === paymentProvider)
                    ?.label || paymentProvider}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatMXN(totalPrice)}</span>
                </div>
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
            Confirmar emergencia
          </Button>
        )}
      </div>
    </div>
  );
}
