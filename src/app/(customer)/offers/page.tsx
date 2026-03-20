"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Tag, MapPin, Users, Clock, CheckCircle2 } from "lucide-react";

interface DailyOffer {
  id: string;
  location_id: string;
  message: string;
  discount_pct: number;
  min_cars_threshold: number;
  expires_at: string;
  current_responses: number;
  threshold_met: boolean;
  location: { name: string };
}

interface Car {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  location_id: string;
}

export default function OffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<DailyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCars, setUserCars] = useState<Car[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptedOffers, setAcceptedOffers] = useState<Set<string>>(new Set());

  const fetchOffers = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Get user's cars with residential locations
    const { data: carsData } = await db
      .from("cars")
      .select("id, plate_number, brand, model, location_id")
      .eq("owner_id", user.id)
      .eq("is_active", true);

    const cars: Car[] = carsData ?? [];
    setUserCars(cars);

    const locationIds = [...new Set(cars.map((c) => c.location_id))].filter(Boolean);
    if (locationIds.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch active offers for user's locations
    const { data: offersData } = await db
      .from("daily_offers")
      .select(
        "id, location_id, message, discount_pct, min_cars_threshold, expires_at, current_responses, threshold_met, location:locations(name)"
      )
      .in("location_id", locationIds)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const parsed = (offersData ?? []).map((o: Record<string, unknown>) => ({
      ...o,
      location: Array.isArray(o.location) ? o.location[0] : o.location,
    }));
    setOffers(parsed as DailyOffer[]);

    // Check which offers the user already accepted
    const offerIds = parsed.map((o: Record<string, unknown>) => o.id);
    if (offerIds.length > 0) {
      const { data: responses } = await db
        .from("daily_offer_responses")
        .select("offer_id")
        .eq("user_id", user.id)
        .in("offer_id", offerIds);

      const accepted = new Set<string>((responses ?? []).map((r: Record<string, unknown>) => r.offer_id as string));
      setAcceptedOffers(accepted);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Realtime updates on responses
  useRealtime({
    table: "daily_offer_responses",
    onPayload: () => {
      fetchOffers();
    },
  });

  const handleAccept = async (offerId: string) => {
    if (!user) return;

    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;

    const carsAtLocation = userCars.filter((c) => c.location_id === offer.location_id);

    if (carsAtLocation.length === 0) return;

    if (carsAtLocation.length === 1) {
      await submitResponse(offerId, carsAtLocation[0].id);
    } else {
      setPendingOfferId(offerId);
      setSelectorOpen(true);
    }
  };

  const submitResponse = async (offerId: string, carId: string) => {
    if (!user) return;
    setAccepting(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    await db.from("daily_offer_responses").insert({
      offer_id: offerId,
      user_id: user.id,
      car_id: carId,
      status: "accepted",
    });

    setAcceptedOffers((prev) => new Set([...prev, offerId]));
    setAccepting(false);
    setSelectorOpen(false);
    setPendingOfferId(null);
    fetchOffers();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expirada";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const pendingOffer = offers.find((o) => o.id === pendingOfferId);
  const carsForSelector = pendingOffer
    ? userCars.filter((c) => c.location_id === pendingOffer.location_id)
    : [];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ofertas del dia</h1>
        <p className="text-sm text-muted-foreground">
          Ofertas exclusivas para tu ubicacion residencial
        </p>
      </div>

      {offers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Tag className="h-12 w-12" />
          <p className="text-sm">No hay ofertas disponibles hoy</p>
          <p className="text-xs">Revisa manana para nuevas ofertas</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => {
            const isAccepted = acceptedOffers.has(offer.id);
            const progress =
              offer.min_cars_threshold > 0
                ? Math.min((offer.current_responses / offer.min_cars_threshold) * 100, 100)
                : 0;

            return (
              <Card key={offer.id}>
                {offer.threshold_met && (
                  <div className="flex items-center gap-2 rounded-t-xl bg-green-100 px-4 py-2 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Equipo en camino!
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">
                          {offer.location?.name ?? "Ubicacion"}
                        </CardTitle>
                      </div>
                    </div>
                    {offer.discount_pct > 0 && (
                      <Badge variant="default">-{offer.discount_pct}%</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{offer.message}</p>

                  {/* Countdown */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{getTimeRemaining(offer.expires_at)}</span>
                  </div>

                  {/* Progress bar */}
                  {offer.min_cars_threshold > 0 && (
                    <div className="space-y-1.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {offer.current_responses} de {offer.min_cars_threshold} vecinos ya se apuntaron!
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {isAccepted ? (
                    <Badge variant="secondary" className="w-full justify-center py-1.5">
                      Ya te apuntaste
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => handleAccept(offer.id)}
                      disabled={accepting}
                      className="w-full"
                    >
                      {accepting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Me apunto!
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Car selector dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent>
          <DialogTitle>Selecciona tu auto</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tienes varios autos en esta ubicacion. Elige con cual te apuntas.
          </p>
          <div className="grid gap-2">
            {carsForSelector.map((car) => (
              <Button
                key={car.id}
                variant="outline"
                className="justify-start"
                disabled={accepting}
                onClick={() => submitResponse(pendingOfferId!, car.id)}
              >
                {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {car.brand} {car.model} — {car.plate_number}
              </Button>
            ))}
          </div>
          <DialogClose render={<Button variant="ghost" className="w-full" />}>
            Cancelar
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
