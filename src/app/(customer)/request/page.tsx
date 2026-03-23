"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMXN } from "@/lib/utils/currency";
import Link from "next/link";
import {
  Car,
  ArrowLeft,
  ArrowRight,
  Droplets,
  Check,
  Loader2,
} from "lucide-react";

interface CarItem {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  color: string | null;
  primary_location_id: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
}

export default function RequestWashPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [cars, setCars] = useState<CarItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cars
  useEffect(() => {
    if (!user) return;
    async function fetchCars() {
      const db = createClient() as any;
      const { data } = await db
        .from("cars")
        .select("id, plate_number, make, model, color, primary_location_id")
        .eq("owner_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setCars(data);
    }
    fetchCars();
  }, [user]);

  // Fetch services
  useEffect(() => {
    async function fetchServices() {
      const db = createClient() as any;
      const { data } = await db
        .from("service_catalog")
        .select("id, name, duration_minutes, base_price")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data) setServices(data);
    }
    fetchServices();
  }, []);

  const toggleService = useCallback((id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const selectedCarData = cars.find((c) => c.id === selectedCar);
  const selectedServiceData = services.filter((s) =>
    selectedServices.includes(s.id)
  );
  const estimatedPrice = selectedServiceData.reduce(
    (sum, s) => sum + (s.base_price || 0),
    0
  );
  const estimatedDuration = selectedServiceData.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );

  const handleSubmit = async () => {
    if (!selectedCar || selectedServices.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          car_id: selectedCar,
          location_id: selectedCarData?.primary_location_id || null,
          services: selectedServices,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear la solicitud");
        setSubmitting(false);
        return;
      }

      router.push(`/bookings/${data.booking_id}/track`);
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const stepLabels = ["Auto", "Servicios", "Confirmar"];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold sm:text-2xl">Solicitar lavado</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  i <= step
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] sm:text-xs ${
                  i <= step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className={`mb-4 h-0.5 flex-1 ${
                  i < step ? "bg-blue-600" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Select Car */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Selecciona tu auto</h2>
          {cars.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Car className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tienes autos registrados.
              </p>
              <Link
                href="/cars/new"
                className={buttonVariants({ variant: "default" })}
              >
                Agregar auto
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                {cars.map((car) => (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => setSelectedCar(car.id)}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      selectedCar === car.id
                        ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Car
                      className={`h-5 w-5 ${
                        selectedCar === car.id
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{car.plate_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {car.make} {car.model}
                        {car.color ? ` - ${car.color}` : ""}
                      </p>
                    </div>
                    {selectedCar === car.id && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(1)}
                disabled={!selectedCar}
                className="w-full"
              >
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 1: Select Services */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Selecciona los servicios</h2>
          {services.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Cargando servicios...
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                {services.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-muted-foreground"
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.duration_minutes} min
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatMXN(service.base_price)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="mb-1 block text-sm font-medium"
                >
                  Notas (opcional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones especiales, lugar exacto, etc."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atras
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedServices.length === 0}
                  className="flex-1"
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Confirma tu solicitud</h2>

          <Card>
            <CardContent className="space-y-4 pt-4">
              {/* Car */}
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">
                    {selectedCarData?.plate_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCarData?.make} {selectedCarData?.model}
                  </p>
                </div>
              </div>

              {/* Services */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Servicios seleccionados
                </p>
                <div className="space-y-1">
                  {selectedServiceData.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{s.name}</span>
                      <span className="font-medium">
                        {formatMXN(s.base_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Duracion estimada</span>
                <span>{estimatedDuration} min</span>
              </div>

              {/* Notes */}
              {notes.trim() && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Notas
                  </p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">
                    Precio estimado
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatMXN(estimatedPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atras
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Droplets className="mr-2 h-4 w-4" />
              )}
              {submitting ? "Enviando..." : "Solicitar lavado"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
