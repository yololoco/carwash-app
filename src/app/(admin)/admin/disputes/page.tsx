"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Dispute {
  id: string;
  subject: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  refund_amount: number | null;
  created_at: string;
  customer: { full_name: string } | null;
  booking: {
    scheduled_date: string;
    car: { plate_number: string } | null;
  } | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Abierta", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  under_review: { label: "En revision", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  resolved_customer: { label: "Favor cliente", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  resolved_business: { label: "Favor negocio", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  closed: { label: "Cerrada", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchDisputes = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const { data } = await db
      .from("disputes")
      .select(
        "id, subject, description, status, resolution_notes, refund_amount, created_at, customer:profiles!disputes_customer_id_fkey(full_name), booking:bookings(scheduled_date, car:cars(plate_number))"
      )
      .order("created_at", { ascending: false });

    const normalized = (data ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      customer: Array.isArray(d.customer) ? d.customer[0] : d.customer,
      booking: Array.isArray(d.booking)
        ? d.booking[0]
          ? {
              ...(d.booking[0] as Record<string, unknown>),
              car: Array.isArray((d.booking[0] as Record<string, unknown>).car)
                ? ((d.booking[0] as Record<string, unknown>).car as unknown[])[0]
                : (d.booking[0] as Record<string, unknown>).car,
            }
          : null
        : d.booking
          ? {
              ...(d.booking as Record<string, unknown>),
              car: Array.isArray((d.booking as Record<string, unknown>).car)
                ? ((d.booking as Record<string, unknown>).car as unknown[])[0]
                : (d.booking as Record<string, unknown>).car,
            }
          : null,
    }));

    setDisputes(normalized as Dispute[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const openDetail = (dispute: Dispute) => {
    setSelected(dispute);
    setResolutionNotes(dispute.resolution_notes ?? "");
    setRefundAmount(dispute.refund_amount?.toString() ?? "");
    setDialogOpen(true);
  };

  const handleResolve = async (status: string) => {
    if (!selected) return;
    setResolving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const updateData: Record<string, unknown> = {
      status,
      resolution_notes: resolutionNotes || null,
    };

    if (status === "resolved_customer" && refundAmount) {
      updateData.refund_amount = parseFloat(refundAmount);
    }

    await db.from("disputes").update(updateData).eq("id", selected.id);
    setResolving(false);
    setDialogOpen(false);
    fetchDisputes();
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
        <h1 className="text-2xl font-bold">Disputas</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona las disputas de los clientes
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertTriangle className="h-12 w-12" />
          <p className="text-sm">No hay disputas registradas</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {disputes.map((dispute) => {
            const cfg = statusConfig[dispute.status] ?? statusConfig.open;
            return (
              <button
                key={dispute.id}
                type="button"
                onClick={() => openDetail(dispute)}
                className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {dispute.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dispute.customer?.full_name ?? "Cliente desconocido"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      cfg.className
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  {dispute.booking && (
                    <>
                      <span>
                        {new Date(dispute.booking.scheduled_date).toLocaleDateString(
                          "es-MX"
                        )}
                      </span>
                      {dispute.booking.car && (
                        <span>{dispute.booking.car.plate_number}</span>
                      )}
                    </>
                  )}
                  <span>
                    {new Date(dispute.created_at).toLocaleDateString("es-MX")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
            <DialogDescription>
              {selected?.customer?.full_name ?? "Cliente"} &middot;{" "}
              {selected?.booking?.car?.plate_number ?? ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Descripcion
              </p>
              <p className="mt-1 text-sm">{selected?.description}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notas de resolucion
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Notas sobre la resolucion..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Monto de reembolso (opcional)
              </label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => handleResolve("resolved_customer")}
              disabled={resolving}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resolver a favor del cliente
            </Button>
            <Button
              onClick={() => handleResolve("resolved_business")}
              disabled={resolving}
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resolver a favor del negocio
            </Button>
            <Button
              onClick={() => handleResolve("closed")}
              disabled={resolving}
              variant="outline"
              className="w-full"
            >
              {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerrar
            </Button>
            <DialogClose render={<Button variant="ghost" className="w-full" />}>
              Cancelar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
