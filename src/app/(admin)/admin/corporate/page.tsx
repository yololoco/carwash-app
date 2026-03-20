"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Building2,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface CorporateAccount {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  billing_email: string | null;
  location_id: string;
  discount_pct: number;
  max_cars: number | null;
  contract_start: string | null;
  contract_end: string | null;
  is_active: boolean;
  notes: string | null;
  location: { name: string } | null;
}

const emptyForm = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  billing_email: "",
  location_id: "",
  discount_pct: "",
  max_cars: "",
  contract_start: "",
  contract_end: "",
  is_active: true,
  notes: "",
};

export default function AdminCorporatePage() {
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Members
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const fetchAccounts = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const [accountsRes, locationsRes] = await Promise.all([
      db
        .from("corporate_accounts")
        .select(
          "id, company_name, contact_name, contact_email, contact_phone, billing_email, location_id, discount_pct, max_cars, contract_start, contract_end, is_active, notes, location:locations(name)"
        )
        .order("company_name"),
      db.from("locations").select("id, name").eq("is_active", true).order("name"),
    ]);

    const parsed = (accountsRes.data ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      location: Array.isArray(a.location) ? a.location[0] : a.location,
    }));

    setAccounts(parsed as CorporateAccount[]);
    setLocations((locationsRes.data ?? []) as Location[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (account: CorporateAccount) => {
    setEditingId(account.id);
    setForm({
      company_name: account.company_name,
      contact_name: account.contact_name,
      contact_email: account.contact_email,
      contact_phone: account.contact_phone ?? "",
      billing_email: account.billing_email ?? "",
      location_id: account.location_id,
      discount_pct: account.discount_pct.toString(),
      max_cars: account.max_cars?.toString() ?? "",
      contract_start: account.contract_start ?? "",
      contract_end: account.contract_end ?? "",
      is_active: account.is_active,
      notes: account.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.location_id) return;
    setSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const payload = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone.trim() || null,
      billing_email: form.billing_email.trim() || null,
      location_id: form.location_id,
      discount_pct: parseFloat(form.discount_pct) || 0,
      max_cars: form.max_cars ? parseInt(form.max_cars) : null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      await db.from("corporate_accounts").update(payload).eq("id", editingId);
      toast.success("Cuenta actualizada");
    } else {
      await db.from("corporate_accounts").insert(payload);
      toast.success("Cuenta creada");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchAccounts();
  };

  // Members management
  const fetchMembers = async (accountId: string) => {
    setMembersLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { data } = await db
      .from("corporate_members")
      .select("id, user_id, profile:profiles(full_name, email)")
      .eq("account_id", accountId);

    const parsed = (data ?? []).map((m: Record<string, unknown>) => {
      const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return {
        id: m.id,
        user_id: m.user_id,
        full_name: (profile as Record<string, unknown>)?.full_name ?? "Sin nombre",
        email: (profile as Record<string, unknown>)?.email ?? "",
      };
    });

    setMembers(parsed as Member[]);
    setMembersLoading(false);
  };

  const toggleMembers = (accountId: string) => {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      setMembers([]);
    } else {
      setExpandedAccountId(accountId);
      fetchMembers(accountId);
    }
  };

  const handleAddMember = async () => {
    if (!expandedAccountId || !addMemberEmail.trim()) return;
    setAddingMember(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Find user by email
    const { data: profileData } = await db
      .from("profiles")
      .select("id")
      .eq("email", addMemberEmail.trim().toLowerCase())
      .single();

    if (!profileData) {
      toast.error("No se encontro un usuario con ese correo");
      setAddingMember(false);
      return;
    }

    await db.from("corporate_members").insert({
      account_id: expandedAccountId,
      user_id: profileData.id,
    });

    toast.success("Miembro agregado");
    setAddMemberEmail("");
    setAddingMember(false);
    fetchMembers(expandedAccountId);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!expandedAccountId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    await db.from("corporate_members").delete().eq("id", memberId);
    toast.success("Miembro eliminado");
    fetchMembers(expandedAccountId);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corporativo</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona cuentas corporativas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Building2 className="h-12 w-12" />
          <p className="text-sm">Sin cuentas corporativas</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      {account.company_name}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {account.contact_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {account.discount_pct > 0 && (
                      <Badge variant="default">-{account.discount_pct}%</Badge>
                    )}
                    <Badge variant={account.is_active ? "secondary" : "destructive"}>
                      {account.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {account.location?.name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {account.location.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {account.contact_email}
                  </span>
                  {account.contact_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {account.contact_phone}
                    </span>
                  )}
                  {account.contract_start && account.contract_end && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(account.contract_start).toLocaleDateString("es-MX")} —{" "}
                      {new Date(account.contract_end).toLocaleDateString("es-MX")}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(account)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMembers(account.id)}
                  >
                    <UserPlus className="mr-1 h-3 w-3" />
                    Miembros
                  </Button>
                </div>

                {/* Members sub-section */}
                {expandedAccountId === account.id && (
                  <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">Miembros</p>

                    {membersLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : members.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sin miembros registrados
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-md bg-background px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {member.full_name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add member */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Correo del miembro"
                        value={addMemberEmail}
                        onChange={(e) => setAddMemberEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={addingMember || !addMemberEmail.trim()}
                        onClick={handleAddMember}
                      >
                        {addingMember ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogTitle>
            {editingId ? "Editar cuenta corporativa" : "Nueva cuenta corporativa"}
          </DialogTitle>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Empresa</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Nombre de la empresa"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contacto</Label>
                <Input
                  id="contact_name"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email contacto</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="email@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefono</Label>
                <Input
                  id="contact_phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="+52..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_email">Email facturacion</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={form.billing_email}
                  onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
                  placeholder="facturas@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ubicacion</Label>
              <Select
                value={form.location_id}
                onValueChange={(v) => v && setForm({ ...form, location_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona ubicacion" />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="discount_pct">Descuento (%)</Label>
                <Input
                  id="discount_pct"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount_pct}
                  onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_cars">Max. autos</Label>
                <Input
                  id="max_cars"
                  type="number"
                  min="1"
                  value={form.max_cars}
                  onChange={(e) => setForm({ ...form, max_cars: e.target.value })}
                  placeholder="Sin limite"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contract_start">Inicio contrato</Label>
                <Input
                  id="contract_start"
                  type="date"
                  value={form.contract_start}
                  onChange={(e) => setForm({ ...form, contract_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_end">Fin contrato</Label>
                <Input
                  id="contract_end"
                  type="date"
                  value={form.contract_end}
                  onChange={(e) => setForm({ ...form, contract_end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Activa</Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: !!checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas internas..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !form.company_name.trim() || !form.location_id}
              className="flex-1"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Guardar cambios" : "Crear cuenta"}
            </Button>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
