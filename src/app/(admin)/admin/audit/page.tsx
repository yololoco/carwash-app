"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/card";
import {
  Loader2,
  ScrollText,
  ChevronDown,
  Filter,
  User,
  Clock,
} from "lucide-react";

interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  user_name: string;
}

const ENTITY_TYPES = [
  { value: "all", label: "Todos" },
  { value: "booking", label: "Reserva" },
  { value: "subscription", label: "Suscripcion" },
  { value: "payment", label: "Pago" },
  { value: "dispute", label: "Disputa" },
  { value: "location", label: "Ubicacion" },
  { value: "staff", label: "Personal" },
];

const ENTITY_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  booking: "default",
  subscription: "secondary",
  payment: "outline",
  dispute: "destructive",
  location: "secondary",
  staff: "outline",
};

const PAGE_SIZE = 100;

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchEntries = useCallback(
    async (currentOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      let query = db
        .from("audit_log")
        .select("id, created_at, action, entity_type, entity_id, user_id")
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (entityType !== "all") {
        query = query.eq("entity_type", entityType);
      }
      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      const { data } = await query;
      const rows = (data ?? []) as Record<string, unknown>[];

      // Fetch user names for all entries with user_id
      const userIds = [...new Set(rows.filter((r) => r.user_id).map((r) => r.user_id as string))];
      let userNames: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await db
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        for (const p of profiles ?? []) {
          userNames[(p as Record<string, unknown>).id as string] =
            ((p as Record<string, unknown>).full_name as string) || "Sin nombre";
        }
      }

      const parsed: AuditEntry[] = rows.map((r) => ({
        id: r.id as string,
        created_at: r.created_at as string,
        action: r.action as string,
        entity_type: r.entity_type as string,
        entity_id: r.entity_id as string,
        user_id: (r.user_id as string) ?? null,
        user_name: r.user_id ? userNames[r.user_id as string] || "Desconocido" : "Sistema",
      }));

      if (append) {
        setEntries((prev) => [...prev, ...parsed]);
      } else {
        setEntries(parsed);
      }

      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
      setLoadingMore(false);
    },
    [entityType, dateFrom, dateTo]
  );

  useEffect(() => {
    setOffset(0);
    fetchEntries(0, false);
  }, [fetchEntries]);

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchEntries(newOffset, true);
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
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registro de acciones en el sistema
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Filter className="h-3 w-3" />
            Tipo
          </Label>
          <Select value={entityType} onValueChange={(v) => v && setEntityType(v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date_from" className="text-xs">
            Desde
          </Label>
          <Input
            id="date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date_to" className="text-xs">
            Hasta
          </Label>
          <Input
            id="date_to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <ScrollText className="h-12 w-12" />
          <p className="text-sm">Sin registros de auditoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} size="sm">
              <CardContent className="space-y-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <Badge
                    variant={ENTITY_BADGE_VARIANT[entry.entity_type] ?? "outline"}
                  >
                    {entry.entity_type}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.created_at).toLocaleString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.user_name}
                  </span>
                  <span className="font-mono text-[10px]">
                    {entry.entity_id?.slice(0, 8)}...
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="mr-2 h-4 w-4" />
              )}
              Cargar mas
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
