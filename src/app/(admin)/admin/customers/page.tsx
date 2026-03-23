"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Loader2,
  Users,
  Search,
  ArrowUpDown,
  Mail,
  Calendar,
  CreditCard,
  ClipboardList,
} from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  subscription_count: number;
  total_spent: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  location_manager: "Manager",
  car_washer: "Lavador",
  customer: "Cliente",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  location_manager: "bg-blue-100 text-blue-800",
  car_washer: "bg-amber-100 text-amber-800",
  customer: "bg-green-100 text-green-800",
};

type SortKey = "name" | "spent" | "date";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const handleRoleChange = async (userId: string, newRole: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db.from("profiles").update({ role: newRole }).eq("id", userId);

    // If promoting to washer, create washer_profile if it doesn't exist
    if (newRole === "car_washer") {
      await db.from("washer_profiles").upsert(
        { user_id: userId, hourly_rate: 150, hire_date: new Date().toISOString().split("T")[0] },
        { onConflict: "user_id" }
      );
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === userId ? { ...c, role: newRole } : c))
    );
  };

  const fetchCustomers = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Fetch customer profiles
    // Fetch ALL users, not just customers
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("full_name");

    if (!profiles || profiles.length === 0) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const customerIds = profiles.map((p: Record<string, unknown>) => p.id);

    // Fetch subscription counts and payment totals in parallel
    const [subsRes, paymentsRes] = await Promise.all([
      db
        .from("subscriptions")
        .select("customer_id")
        .in("customer_id", customerIds)
        .eq("status", "active"),
      db
        .from("payments")
        .select("customer_id, amount")
        .in("customer_id", customerIds)
        .eq("status", "succeeded"),
    ]);

    // Aggregate subscription counts
    const subCounts: Record<string, number> = {};
    for (const sub of subsRes.data ?? []) {
      const cid = (sub as Record<string, unknown>).customer_id as string;
      subCounts[cid] = (subCounts[cid] || 0) + 1;
    }

    // Aggregate payment totals
    const spentTotals: Record<string, number> = {};
    for (const pay of paymentsRes.data ?? []) {
      const cid = (pay as Record<string, unknown>).customer_id as string;
      const amt = (pay as Record<string, unknown>).amount as number;
      spentTotals[cid] = (spentTotals[cid] || 0) + (amt || 0);
    }

    const result: Customer[] = profiles.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      full_name: (p.full_name as string) || "Sin nombre",
      email: (p.email as string) || "",
      role: (p.role as string) || "customer",
      created_at: p.created_at as string,
      subscription_count: subCounts[p.id as string] || 0,
      total_spent: spentTotals[p.id as string] || 0,
    }));

    setCustomers(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter and sort
  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.full_name.localeCompare(b.full_name);
      case "spent":
        return b.total_spent - a.total_spent;
      case "date":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

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
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} usuario{customers.length !== 1 ? "s" : ""} registrado{customers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44">
            <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="spent">Total gastado</SelectItem>
            <SelectItem value="date">Fecha registro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Users className="h-12 w-12" />
          <p className="text-sm">
            {search ? "No se encontraron clientes" : "Sin clientes registrados"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((customer) => (
            <Card key={customer.id} size="sm">
              <CardContent className="space-y-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {customer.full_name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      {customer.email}
                    </p>
                  </div>
                  <Select
                    value={customer.role}
                    onValueChange={(v) => v && handleRoleChange(customer.id, v)}
                  >
                    <SelectTrigger className={`h-7 w-auto gap-1 rounded-full border-0 px-2.5 text-[11px] font-semibold ${ROLE_COLORS[customer.role] || "bg-gray-100"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">{ROLE_LABELS.customer}</SelectItem>
                      <SelectItem value="car_washer">{ROLE_LABELS.car_washer}</SelectItem>
                      <SelectItem value="location_manager">{ROLE_LABELS.location_manager}</SelectItem>
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {formatMXN(customer.total_spent)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(customer.created_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
