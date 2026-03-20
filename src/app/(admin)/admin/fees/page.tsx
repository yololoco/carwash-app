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
import { Plus, Pencil, Loader2, DollarSign } from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";
import type { Location } from "@/types/database";

interface PremiumFee {
  id: string;
  name: string;
  fee_type: string;
  amount: number | null;
  percentage: number | null;
  location_id: string | null;
  is_active: boolean;
}

const FEE_TYPES: Record<string, string> = {
  emergency: "Lavado de emergencia",
  time_slot: "Horario especifico",
  one_time_surcharge: "Cargo por lavado unico",
  peak_hour: "Hora pico",
};

export default function AdminFeesPage() {
  const [fees, setFees] = useState<PremiumFee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PremiumFee | null>(null);

  const [name, setName] = useState("");
  const [feeType, setFeeType] = useState("emergency");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [locationId, setLocationId] = useState<string>("global");
  const [isActive, setIsActive] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  const fetchData = async () => {
    const [feeRes, locRes] = await Promise.all([
      db.from("premium_fees").select("*").order("created_at"),
      db.from("locations").select("id, name").eq("is_active", true),
    ]);
    setFees((feeRes.data || []) as PremiumFee[]);
    setLocations((locRes.data || []) as Location[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setName(""); setFeeType("emergency"); setAmount(""); setPercentage("");
    setLocationId("global"); setIsActive(true); setEditing(null);
  };

  const openEdit = (fee: PremiumFee) => {
    setEditing(fee);
    setName(fee.name);
    setFeeType(fee.fee_type);
    setAmount(fee.amount ? String(fee.amount) : "");
    setPercentage(fee.percentage ? String(fee.percentage) : "");
    setLocationId(fee.location_id || "global");
    setIsActive(fee.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name,
      fee_type: feeType,
      amount: amount ? parseFloat(amount) : null,
      percentage: percentage ? parseFloat(percentage) : null,
      location_id: locationId === "global" ? null : locationId,
      is_active: isActive,
    };

    if (editing) {
      await db.from("premium_fees").update(payload).eq("id", editing.id);
    } else {
      await db.from("premium_fees").insert(payload);
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
          <h1 className="text-2xl font-bold">Cargos premium</h1>
          <p className="text-muted-foreground">
            Cargos por emergencias, horarios especificos y mas.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo cargo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay cargos premium configurados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fees.map((fee) => (
            <Card
              key={fee.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => openEdit(fee)}
            >
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{fee.name}</p>
                    {!fee.is_active && <Badge variant="secondary">Inactivo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {FEE_TYPES[fee.fee_type] || fee.fee_type}
                    {fee.amount ? ` · ${formatMXN(fee.amount)}` : ""}
                    {fee.percentage ? ` · ${fee.percentage}%` : ""}
                    {fee.location_id ? "" : " · Global"}
                  </p>
                </div>
                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogTitle>{editing ? "Editar cargo" : "Nuevo cargo"}</DialogTitle>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cargo por emergencia" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={feeType} onValueChange={(v) => v && setFeeType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FEE_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto fijo (MXN)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Porcentaje (%)</Label>
                  <Input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} min="0" max="100" placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ubicacion</Label>
                <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (todas)</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Activo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSave} disabled={saving || !name}>
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
