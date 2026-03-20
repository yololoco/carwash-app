"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMXN } from "@/lib/utils/currency";
import { calculateBookingPrice } from "@/lib/cost/calculator";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Car,
  MapPin,
  Sparkles,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  Loader2,
} from "lucide-react";

/* ---- Types ---- */

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

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  base_price: number;
  estimated_duration_minutes: number;
  is_add_on: boolean;
}

interface PremiumFee {
  name: string;
  fee_type: string;
  amount: number | null;
  percentage: number | null;
}

interface AvailabilitySlot {
  hour: number;
  remaining: number;
}

/* ---- Constants ---- */

const STEP_ICONS = [Car, MapPin, Sparkles, Calendar, Clock, CreditCard, CreditCard, CheckCircle2];
const STEP_LABELS = [
  "Auto",
  "Ubicacion",
  "Servicios",
  "Fecha",
  "Horario",
  "Precio",
  "Pago",
  "Confirmar",
];

const CATEGORY_LABELS: Record<string, string> = {
  wash: "Lavado",
  add_on: "Adicionales",
  detailing: "Detallado",
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

export default function OneTimeBookingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [cars, setCars] = useState<CarRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [premiumFees, setPremiumFees] = useState<PremiumFee[]>([]);

  // Selections
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);

  // Availability
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  /* ---- Fetch initial data ---- */
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [carsRes, locsRes, svcsRes, feesRes] = await Promise.all([
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
          .from("service_catalog")
          .select("id, name, category, base_price, estimated_duration_minutes, is_add_on")
          .eq("is_active", true)
          .order("name"),
        db
          .from("premium_fees")
          .select("name, fee_type, amount, percentage"),
      ]);

      setCars((carsRes.data || []) as CarRow[]);
      setLocations((locsRes.data || []) as LocationRow[]);
      setServices((svcsRes.data || []) as ServiceRow[]);
      setPremiumFees((feesRes.data || []) as PremiumFee[]);
      setLoading(false);
    }

    if (!authLoading) fetchData();
  }, [user, authLoading]);

  /* ---- Auto-select location when car changes ---- */
  useEffect(() => {
    if (!selectedCarId) return;
    const car = cars.find((c) => c.id === selectedCarId);
    if (car?.primary_location_id) {
      setSelectedLocationId(car.primary_location_id);
    } else {
      setSelectedLocationId(null);
    }
  }, [selectedCarId, cars]);

  /* ---- Fetch availability when date changes ---- */
  useEffect(() => {
    if (!selectedDate || !selectedLocationId) return;

    async function fetchSlots() {
      setSlotsLoading(true);
      try {
        const res = await fetch(
          `/api/locations/${selectedLocationId}/availability?date=${selectedDate}`
        );
        const data = await res.json();
        setAvailableSlots((data.slots || []) as AvailabilitySlot[]);
      } catch {
        setAvailableSlots([]);
      }
      setSlotsLoading(false);
    }

    fetchSlots();
  }, [selectedDate, selectedLocationId]);

  /* ---- Helpers ---- */
  const selectedCar = cars.find((c) => c.id === selectedCarId);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));

  const basePrice = selectedServices.reduce((sum, s) => sum + s.base_price, 0);

  const priceBreakdown = calculateBookingPrice({
    basePrice,
    isEmergency: false,
    isOneTime: true,
    premiumFees,
    discountPct: 0,
  });

  const groupedServices = services.reduce<Record<string, ServiceRow[]>>((acc, svc) => {
    const cat = svc.is_add_on ? "add_on" : (svc.category || "wash");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  }, {});

  // Generate next 14 days
  const dateCards: { date: string; label: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    dateCards.push({ date: iso, label });
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedCarId;
      case 1:
        return !!selectedLocationId;
      case 2:
        return selectedServiceIds.length > 0;
      case 3:
        return !!selectedDate;
      case 4:
        return selectedSlot !== null;
      case 5:
        return true; // price review
      case 6:
        return !!paymentProvider;
      default:
        return true;
    }
  };

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);

    try {
      const scheduledTimeStart = `${String(selectedSlot).padStart(2, "0")}:00`;
      const scheduledTimeEnd = `${String((selectedSlot ?? 0) + 1).padStart(2, "0")}:00`;

      // Create booking
      const { data: booking, error: bookingError } = await db
        .from("bookings")
        .insert({
          customer_id: user.id,
          car_id: selectedCarId,
          location_id: selectedLocationId,
          scheduled_date: selectedDate,
          scheduled_time_start: scheduledTimeStart,
          scheduled_time_end: scheduledTimeEnd,
          services: selectedServiceIds,
          is_one_time: true,
          is_emergency: false,
          status: "pending",
          total_price: priceBreakdown.totalPrice,
        })
        .select("id")
        .single();

      if (bookingError || !booking) throw bookingError;

      // Create payment
      await db.from("payments").insert({
        booking_id: booking.id,
        customer_id: user.id,
        amount: priceBreakdown.totalPrice,
        payment_provider: paymentProvider,
        status: paymentProvider === "cash" ? "pending" : "processing",
      });

      router.push("/bookings");
    } catch (err) {
      console.error("Error al crear reservacion:", err);
      setSubmitting(false);
    }
  }

  /* ---- Loading ---- */
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
          <h1 className="text-xl font-bold">Lavado unico</h1>
          <p className="text-sm text-muted-foreground">
            Reserva un lavado sin suscripcion
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
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
                  "text-[10px] truncate",
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

      {/* Step 2: Services */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selecciona servicios</h2>
          {Object.entries(groupedServices).map(([cat, svcs]) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {CATEGORY_LABELS[cat] || cat}
              </h3>
              {svcs.map((svc) => {
                const isSelected = selectedServiceIds.includes(svc.id);
                return (
                  <Card
                    key={svc.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleService(svc.id)}
                  >
                    <CardContent className="flex items-center gap-3 py-3">
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {svc.estimated_duration_minutes} min
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatMXN(svc.base_price)}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Date */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selecciona una fecha</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {dateCards.map((dc) => (
              <Card
                key={dc.date}
                className={cn(
                  "cursor-pointer text-center transition-colors",
                  selectedDate === dc.date
                    ? "ring-2 ring-primary"
                    : "hover:bg-muted/50"
                )}
                onClick={() => {
                  setSelectedDate(dc.date);
                  setSelectedSlot(null);
                }}
              >
                <CardContent className="py-3">
                  <p className="text-xs font-medium capitalize">{dc.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Time slot */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selecciona un horario</h2>
          {slotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableSlots.map((slot) => (
                <Card
                  key={slot.hour}
                  className={cn(
                    "cursor-pointer text-center transition-colors",
                    selectedSlot === slot.hour
                      ? "ring-2 ring-primary"
                      : "hover:bg-muted/50",
                    slot.remaining <= 0 && "pointer-events-none opacity-40"
                  )}
                  onClick={() => {
                    if (slot.remaining > 0) setSelectedSlot(slot.hour);
                  }}
                >
                  <CardContent className="py-3">
                    <p className="text-sm font-medium">
                      {String(slot.hour).padStart(2, "0")}:00 -{" "}
                      {String(slot.hour + 1).padStart(2, "0")}:00
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.remaining > 0
                        ? `${slot.remaining} disponible${slot.remaining > 1 ? "s" : ""}`
                        : "Lleno"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Price breakdown */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Desglose de precio</h2>
          <Card>
            <CardContent className="space-y-3 py-4">
              {priceBreakdown.details.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span
                    className={cn(
                      "font-medium",
                      item.amount < 0 && "text-green-600"
                    )}
                  >
                    {item.amount < 0 ? "- " : ""}
                    {formatMXN(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatMXN(priceBreakdown.totalPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services summary */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Servicios seleccionados
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedServices.map((svc) => (
                <Badge key={svc.id} variant="secondary">
                  {svc.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Payment */}
      {currentStep === 6 && (
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

      {/* Step 7: Confirm */}
      {currentStep === 7 && (
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
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-medium">
                  {selectedSlot !== null
                    ? `${String(selectedSlot).padStart(2, "0")}:00 - ${String(selectedSlot + 1).padStart(2, "0")}:00`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicios</span>
                <span className="text-right font-medium">
                  {selectedServices.map((s) => s.name).join(", ")}
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
                  <span className="text-primary">
                    {formatMXN(priceBreakdown.totalPrice)}
                  </span>
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
        {currentStep < 7 ? (
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
            Confirmar reservacion
          </Button>
        )}
      </div>
    </div>
  );
}
