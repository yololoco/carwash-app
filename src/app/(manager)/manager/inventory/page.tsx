"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw } from "lucide-react";

interface StockRow {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  inventory_items: {
    name: string;
    unit: string;
    reorder_point: number;
  };
  locations: {
    name: string;
  };
}

interface Location {
  id: string;
  name: string;
}

export default function ManagerInventoryPage() {
  const { user } = useAuth();
  const db = createClient() as any;

  const [stock, setStock] = useState<StockRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [myLocationId, setMyLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restock dialog
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockRow, setRestockRow] = useState<StockRow | null>(null);
  const [restockLocation, setRestockLocation] = useState("");
  const [restockQty, setRestockQty] = useState(0);
  const [restockNotes, setRestockNotes] = useState("");

  const fetchMyLocation = useCallback(async () => {
    if (!user) return;
    const { data } = await db
      .from("location_staff")
      .select("location_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (data) setMyLocationId(data.location_id);
    return data?.location_id ?? null;
  }, [user]);

  const fetchStock = useCallback(
    async (locationId: string) => {
      const { data } = await db
        .from("inventory_stock")
        .select(
          "*, inventory_items(name, unit, reorder_point), locations(name)"
        )
        .eq("location_id", locationId)
        .order("quantity", { ascending: true });
      if (data) setStock(data);
    },
    []
  );

  const fetchLocations = useCallback(async () => {
    const { data } = await db
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (data) setLocations(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const locId = await fetchMyLocation();
      await fetchLocations();
      if (locId) await fetchStock(locId);
      setLoading(false);
    })();
  }, [user, fetchMyLocation, fetchStock, fetchLocations]);

  function openRestockDialog(row: StockRow) {
    setRestockRow(row);
    setRestockLocation(row.location_id);
    setRestockQty(0);
    setRestockNotes("");
    setRestockOpen(true);
  }

  async function submitRestock() {
    if (!restockRow || restockQty <= 0) return;
    await db.from("inventory_transactions").insert({
      item_id: restockRow.item_id,
      location_id: restockLocation,
      type: "restock",
      quantity: restockQty,
      notes: restockNotes || null,
      performed_by: user?.id,
    });
    setRestockOpen(false);
    if (myLocationId) fetchStock(myLocationId);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Inventario</h1>
      <p className="text-sm text-muted-foreground">
        Stock de tu ubicacion ({stock.length} productos)
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {stock.map((row) => {
          const low =
            row.quantity < (row.inventory_items?.reorder_point ?? 0);
          return (
            <Card key={row.id} size="sm">
              <CardHeader>
                <CardTitle>{row.inventory_items?.name}</CardTitle>
                <CardAction>
                  {low ? (
                    <Badge variant="destructive">Bajo</Badge>
                  ) : (
                    <Badge variant="secondary">OK</Badge>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Ubicacion:</span>
                  <span>{row.locations?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Cantidad:</span>
                  <span className={low ? "font-bold text-destructive" : ""}>
                    {row.quantity} {row.inventory_items?.unit}
                  </span>
                </div>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRestockDialog(row)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reabastecer
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {stock.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground">
            Sin registros de stock para tu ubicacion.
          </p>
        )}
      </div>

      {/* ── Restock Dialog ── */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent>
          <DialogTitle>
            Reabastecer: {restockRow?.inventory_items?.name}
          </DialogTitle>

          <div className="grid gap-3">
            <div>
              <Label>Ubicacion</Label>
              <Select
                value={restockLocation}
                onValueChange={(v) => v && setRestockLocation(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
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

            <div>
              <Label htmlFor="restock-qty">Cantidad</Label>
              <Input
                id="restock-qty"
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="restock-notes">Notas</Label>
              <Input
                id="restock-notes"
                value={restockNotes}
                onChange={(e) => setRestockNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={submitRestock}>Reabastecer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
