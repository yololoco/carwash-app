"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
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
import { Plus, Pencil, Loader2, Wrench } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_add_on: boolean;
  estimated_duration_minutes: number;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: "wash", label: "Lavado" },
  { value: "add_on", label: "Extra" },
  { value: "detailing", label: "Detallado" },
];

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("wash");
  const [isAddOn, setIsAddOn] = useState(false);
  const [duration, setDuration] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  const fetchServices = async () => {
    const { data } = await db
      .from("service_catalog")
      .select("*")
      .order("sort_order", { ascending: true });
    setServices((data || []) as Service[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("wash");
    setIsAddOn(false);
    setDuration("30");
    setIsActive(true);
    setSortOrder("0");
    setEditing(null);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setName(service.name);
    setDescription(service.description || "");
    setCategory(service.category);
    setIsAddOn(service.is_add_on);
    setDuration(String(service.estimated_duration_minutes));
    setIsActive(service.is_active);
    setSortOrder(String(service.sort_order));
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name,
      description: description || null,
      category,
      is_add_on: isAddOn,
      estimated_duration_minutes: parseInt(duration),
      is_active: isActive,
      sort_order: parseInt(sortOrder),
    };

    if (editing) {
      await db.from("service_catalog").update(payload).eq("id", editing.id);
    } else {
      await db.from("service_catalog").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-muted-foreground">
            Catalogo de servicios de lavado y extras.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo servicio
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay servicios registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <Card
              key={service.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => openEdit(service)}
            >
              <CardContent className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{service.name}</p>
                    {!service.is_active && (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                    {service.is_add_on && (
                      <Badge variant="outline">Extra</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORIES.find((c) => c.value === service.category)?.label} · {service.estimated_duration_minutes} min
                  </p>
                </div>
                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogTitle>
              {editing ? "Editar servicio" : "Nuevo servicio"}
            </DialogTitle>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lavado exterior basico"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion del servicio..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duracion (min)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={isAddOn} onCheckedChange={setIsAddOn} />
                  <Label>Es extra/add-on</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Activo</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
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
