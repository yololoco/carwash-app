"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Send,
  Tag,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface WashPackage {
  id: string;
  name: string;
}

interface Offer {
  id: string;
  message: string;
  discount_pct: number;
  min_cars_threshold: number;
  current_responses: number;
  threshold_met: boolean;
  expires_at: string;
  created_at: string;
  package_ids: string[] | null;
}

export default function ManagerOffersPage() {
  const { user } = useAuth();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [packages, setPackages] = useState<WashPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);

  // Form state
  const [message, setMessage] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("4");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { data: staffData } = await db
      .from("location_staff")
      .select("location_id")
      .eq("user_id", user.id)
      .single();

    if (!staffData) {
      setLoading(false);
      return;
    }

    setLocationId(staffData.location_id);

    const [offersRes, packagesRes] = await Promise.all([
      db
        .from("daily_offers")
        .select(
          "id, message, discount_pct, min_cars_threshold, current_responses, threshold_met, expires_at, created_at, package_ids"
        )
        .eq("location_id", staffData.location_id)
        .order("created_at", { ascending: false }),
      db
        .from("wash_packages")
        .select("id, name")
        .eq("location_id", staffData.location_id)
        .eq("is_active", true),
    ]);

    setOffers((offersRes.data ?? []) as Offer[]);
    setPackages((packagesRes.data ?? []) as WashPackage[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!user || !locationId || !message.trim()) return;
    setCreating(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const hours = parseInt(expiresInHours) || 4;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    await db.from("daily_offers").insert({
      location_id: locationId,
      message: message.trim(),
      discount_pct: parseFloat(discountPct) || 0,
      min_cars_threshold: parseInt(minThreshold) || 5,
      expires_at: expiresAt,
      package_ids: selectedPackages.length > 0 ? selectedPackages : null,
      current_responses: 0,
      threshold_met: false,
    });

    setMessage("");
    setDiscountPct("");
    setMinThreshold("");
    setExpiresInHours("4");
    setSelectedPackages([]);
    setCreating(false);
    fetchData();
  };

  const handleDispatch = async (offerId: string) => {
    setDispatching(offerId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    await db
      .from("daily_offers")
      .update({ threshold_met: true })
      .eq("id", offerId);

    setDispatching(null);
    fetchData();
  };

  const togglePackage = (pkgId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(pkgId) ? prev.filter((p) => p !== pkgId) : [...prev, pkgId]
    );
  };

  const isExpired = (expiresAt: string) =>
    new Date(expiresAt).getTime() < Date.now();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeOffers = offers.filter((o) => !isExpired(o.expires_at));
  const pastOffers = offers.filter((o) => isExpired(o.expires_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ofertas</h1>
        <p className="text-sm text-muted-foreground">
          Crea y gestiona ofertas diarias para residentes
        </p>
      </div>

      {/* Create offer form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Crear oferta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: Lavado express para todo el condominio!"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="discount">Descuento (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Min. autos</Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expira en (horas)</Label>
            <Input
              id="expires"
              type="number"
              min="1"
              max="48"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              placeholder="4"
            />
          </div>

          {packages.length > 0 && (
            <div className="space-y-2">
              <Label>Paquetes incluidos</Label>
              <div className="flex flex-wrap gap-2">
                {packages.map((pkg) => {
                  const isSelected = selectedPackages.includes(pkg.id);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => togglePackage(pkg.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {pkg.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating || !message.trim()}
            className="w-full"
          >
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publicar oferta
          </Button>
        </CardContent>
      </Card>

      {/* Active offers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ofertas activas</h2>
        {activeOffers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Tag className="h-8 w-8" />
            <p className="text-sm">Sin ofertas activas</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                dispatching={dispatching === offer.id}
                onDispatch={() => handleDispatch(offer.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past offers */}
      {pastOffers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ofertas pasadas</h2>
          <div className="grid gap-4">
            {pastOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  dispatching,
  onDispatch,
  isPast,
}: {
  offer: Offer;
  dispatching?: boolean;
  onDispatch?: () => void;
  isPast?: boolean;
}) {
  const progress =
    offer.min_cars_threshold > 0
      ? Math.min((offer.current_responses / offer.min_cars_threshold) * 100, 100)
      : 0;

  return (
    <Card className={isPast ? "opacity-60" : ""}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">{offer.message}</p>
          <div className="flex shrink-0 gap-1.5">
            {offer.discount_pct > 0 && (
              <Badge variant="default">-{offer.discount_pct}%</Badge>
            )}
            {offer.threshold_met ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Despachado
              </Badge>
            ) : isPast ? (
              <Badge variant="secondary">Expirada</Badge>
            ) : null}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>
                {offer.current_responses} / {offer.min_cars_threshold} respuestas
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {new Date(offer.expires_at).toLocaleString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Dispatch button (only for active, non-dispatched offers) */}
        {!isPast && !offer.threshold_met && onDispatch && (
          <Button
            onClick={onDispatch}
            disabled={dispatching}
            variant="outline"
            className="w-full"
          >
            {dispatching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Despachar (override)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
