"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Loader2, Package } from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";

interface WashPackage {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  included_services: string[];
  base_price: number;
  is_active: boolean;
  is_subscription: boolean;
  multi_car_discount_pct: number;
  sort_order: number;
}

interface Service {
  id: string;
  name: string;
}

const FREQUENCIES: Record<string, string> = {
  daily: "Diario",
  twice_weekly: "2x semana",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  one_time: "Unico",
};

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<WashPackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<WashPackage | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [basePrice, setBasePrice] = useState("");
  const [isSubscription, setIsSubscription] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [multiCarDiscount, setMultiCarDiscount] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  const fetchData = async () => {
    const [pkgRes, svcRes] = await Promise.all([
      db.from("wash_packages").select("*").order("sort_order"),
      db.from("service_catalog").select("id, name").eq("is_active", true).order("sort_order"),
    ]);
    setPackages((pkgRes.data || []) as WashPackage[]);
    setServices((svcRes.data || []) as Service[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setName(""); setDescription(""); setFrequency("weekly");
    setBasePrice(""); setIsSubscription(true); setIsActive(true);
    setSelectedServices([]); setMultiCarDiscount("0"); setSortOrder("0");
    setEditing(null);
  };

  const openEdit = (pkg: WashPackage) => {
    setEditing(pkg);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setFrequency(pkg.frequency);
    setBasePrice(String(pkg.base_price));
    setIsSubscription(pkg.is_subscription);
    setIsActive(pkg.is_active);
    setSelectedServices(pkg.included_services || []);
    setMultiCarDiscount(String(pkg.multi_car_discount_pct || 0));
    setSortOrder(String(pkg.sort_order));
    setDialogOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name,
      description: description || null,
      frequency,
      included_services: selectedServices,
      base_price: parseFloat(basePrice),
      currency: "MXN",
      is_subscription: isSubscription,
      is_active: isActive,
      multi_car_discount_pct: parseFloat(multiCarDiscount),
      sort_order: parseInt(sortOrder),
    };

    if (editing) {
      await db.from("wash_packages").update(payload).eq("id", editing.id);
    } else {
      await db.from("wash_packages").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planes</h1>
          <p className="text-muted-foreground">
            Paquetes de lavado y suscripciones.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay planes registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => openEdit(pkg)}
            >
              <CardContent className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{pkg.name}</p>
                    <Badge variant="outline">
                      {FREQUENCIES[pkg.frequency] || pkg.frequency}
                    </Badge>
                    {!pkg.is_active && (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatMXN(pkg.base_price)}/{pkg.is_subscription ? "mes" : "lavado"} · {pkg.included_services?.length || 0} servicios
                  </p>
                </div>
                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogTitle>
              {editing ? "Editar plan" : "Nuevo plan"}
            </DialogTitle>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan Premium Semanal" />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQUENCIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Precio base (MXN)</Label>
                  <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} min="0" step="0.01" />
                </div>
              </div>

              {/* Services multi-select */}
              <div className="space-y-2">
                <Label>Servicios incluidos</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {services.map((svc) => (
                    <label key={svc.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(svc.id)}
                        onChange={() => toggleService(svc.id)}
                        className="rounded"
                      />
                      {svc.name}
                    </label>
                  ))}
                  {services.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Crea servicios primero.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descuento multi-auto (%)</Label>
                  <Input type="number" value={multiCarDiscount} onChange={(e) => setMultiCarDiscount(e.target.value)} min="0" max="100" />
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min="0" />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={isSubscription} onCheckedChange={setIsSubscription} />
                  <Label>Suscripcion</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Activo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSave} disabled={saving || !name || !basePrice}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Guardar" : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
