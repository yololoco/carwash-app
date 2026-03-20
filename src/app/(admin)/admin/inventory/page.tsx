"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Plus,
  Pencil,
  Package,
  ArrowRightLeft,
  RotateCcw,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unit_cost: number;
  supplier_name: string | null;
  supplier_contact: string | null;
  reorder_point: number;
  reorder_quantity: number;
  is_active: boolean;
}

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

const categoryLabels: Record<string, string> = {
  chemical: "Quimico",
  tool: "Herramienta",
  consumable: "Consumible",
  equipment: "Equipo",
};

const unitLabels: Record<string, string> = {
  litros: "Litros",
  ml: "Mililitros",
  unidades: "Unidades",
  gramos: "Gramos",
};

const emptyItem = {
  name: "",
  sku: "",
  category: "chemical",
  unit: "litros",
  unit_cost: 0,
  supplier_name: "",
  supplier_contact: "",
  reorder_point: 0,
  reorder_quantity: 0,
  is_active: true,
};

export default function AdminInventoryPage() {
  const { user } = useAuth();
  const db = createClient() as any;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyItem);

  // Restock dialog
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockRow, setRestockRow] = useState<StockRow | null>(null);
  const [restockLocation, setRestockLocation] = useState("");
  const [restockQty, setRestockQty] = useState(0);
  const [restockNotes, setRestockNotes] = useState("");

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferRow, setTransferRow] = useState<StockRow | null>(null);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferQty, setTransferQty] = useState(0);

  const fetchItems = useCallback(async () => {
    const { data } = await db
      .from("inventory_items")
      .select("*")
      .order("name");
    if (data) setItems(data);
  }, []);

  const fetchStock = useCallback(async () => {
    const { data } = await db
      .from("inventory_stock")
      .select("*, inventory_items(name, unit, reorder_point), locations(name)")
      .order("quantity", { ascending: true });
    if (data) setStock(data);
  }, []);

  const fetchLocations = useCallback(async () => {
    const { data } = await db
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (data) setLocations(data);
  }, []);

  useEffect(() => {
    Promise.all([fetchItems(), fetchStock(), fetchLocations()]).then(() =>
      setLoading(false)
    );
  }, [fetchItems, fetchStock, fetchLocations]);

  function openCreateDialog() {
    setEditingItem(null);
    setForm(emptyItem);
    setItemDialogOpen(true);
  }

  function openEditDialog(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      unit_cost: item.unit_cost,
      supplier_name: item.supplier_name ?? "",
      supplier_contact: item.supplier_contact ?? "",
      reorder_point: item.reorder_point,
      reorder_quantity: item.reorder_quantity,
      is_active: item.is_active,
    });
    setItemDialogOpen(true);
  }

  async function saveItem() {
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      unit: form.unit,
      unit_cost: form.unit_cost,
      supplier_name: form.supplier_name || null,
      supplier_contact: form.supplier_contact || null,
      reorder_point: form.reorder_point,
      reorder_quantity: form.reorder_quantity,
      is_active: form.is_active,
    };

    if (editingItem) {
      await db.from("inventory_items").update(payload).eq("id", editingItem.id);
    } else {
      await db.from("inventory_items").insert(payload);
    }

    setItemDialogOpen(false);
    fetchItems();
  }

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
    fetchStock();
  }

  function openTransferDialog(row: StockRow) {
    setTransferRow(row);
    setTransferFrom(row.location_id);
    setTransferTo("");
    setTransferQty(0);
    setTransferOpen(true);
  }

  async function submitTransfer() {
    if (!transferRow || transferQty <= 0 || !transferFrom || !transferTo)
      return;
    await db.from("inventory_transactions").insert([
      {
        item_id: transferRow.item_id,
        location_id: transferFrom,
        type: "transfer",
        quantity: -transferQty,
        notes: `Transferencia a ${locations.find((l) => l.id === transferTo)?.name}`,
        performed_by: user?.id,
      },
      {
        item_id: transferRow.item_id,
        location_id: transferTo,
        type: "transfer",
        quantity: transferQty,
        notes: `Transferencia desde ${locations.find((l) => l.id === transferFrom)?.name}`,
        performed_by: user?.id,
      },
    ]);
    setTransferOpen(false);
    fetchStock();
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

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        {/* ── Productos Tab ── */}
        <TabsContent value="productos">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {items.length} productos registrados
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {item.name}
                  </CardTitle>
                  <CardAction>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">SKU:</span>
                    <span>{item.sku}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {categoryLabels[item.category] ?? item.category}
                    </Badge>
                    <span className="text-muted-foreground">
                      {unitLabels[item.unit] ?? item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Costo unit.:</span>
                    <span className="font-medium">
                      {formatMXN(item.unit_cost)}
                    </span>
                  </div>
                  {item.supplier_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Proveedor:</span>
                      <span>{item.supplier_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Punto reorden:
                    </span>
                    <span>{item.reorder_point}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Stock Tab ── */}
        <TabsContent value="stock">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Niveles de stock por ubicacion
            </p>
          </div>

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
                      <span
                        className={low ? "font-bold text-destructive" : ""}
                      >
                        {row.quantity} {row.inventory_items?.unit}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRestockDialog(row)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Reabastecer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTransferDialog(row)}
                      >
                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                        Transferir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit Item Dialog ── */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingItem ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="item-name">Nombre</Label>
              <Input
                id="item-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => v && setForm({ ...form, category: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chemical">Quimico</SelectItem>
                  <SelectItem value="tool">Herramienta</SelectItem>
                  <SelectItem value="consumable">Consumible</SelectItem>
                  <SelectItem value="equipment">Equipo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unidad</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => v && setForm({ ...form, unit: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="litros">Litros</SelectItem>
                  <SelectItem value="ml">Mililitros</SelectItem>
                  <SelectItem value="unidades">Unidades</SelectItem>
                  <SelectItem value="gramos">Gramos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="item-cost">Costo unitario</Label>
              <Input
                id="item-cost"
                type="number"
                min={0}
                step={0.01}
                value={form.unit_cost}
                onChange={(e) =>
                  setForm({ ...form, unit_cost: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <Label htmlFor="item-supplier">Proveedor</Label>
              <Input
                id="item-supplier"
                value={form.supplier_name}
                onChange={(e) =>
                  setForm({ ...form, supplier_name: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="item-supplier-contact">
                Contacto proveedor
              </Label>
              <Input
                id="item-supplier-contact"
                value={form.supplier_contact}
                onChange={(e) =>
                  setForm({ ...form, supplier_contact: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-reorder-point">Punto reorden</Label>
                <Input
                  id="item-reorder-point"
                  type="number"
                  min={0}
                  value={form.reorder_point}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reorder_point: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="item-reorder-qty">Cant. reorden</Label>
                <Input
                  id="item-reorder-qty"
                  type="number"
                  min={0}
                  value={form.reorder_quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reorder_quantity: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_active: Boolean(checked) })
                }
              />
              <Label>Activo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={saveItem}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* ── Transfer Dialog ── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogTitle>
            Transferir: {transferRow?.inventory_items?.name}
          </DialogTitle>

          <div className="grid gap-3">
            <div>
              <Label>Desde</Label>
              <Select
                value={transferFrom}
                onValueChange={(v) => v && setTransferFrom(v)}
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
              <Label>Hacia</Label>
              <Select
                value={transferTo}
                onValueChange={(v) => v && setTransferTo(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== transferFrom)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transfer-qty">Cantidad</Label>
              <Input
                id="transfer-qty"
                type="number"
                min={1}
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={submitTransfer}>Transferir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
