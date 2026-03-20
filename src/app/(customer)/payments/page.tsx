"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMXN } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Loader2 } from "lucide-react";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  payment_method: string;
  payment_provider: string;
  description: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  succeeded: {
    label: "Exitoso",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  pending: {
    label: "Pendiente",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  failed: {
    label: "Fallido",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  refunded: {
    label: "Reembolsado",
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
  partially_refunded: {
    label: "Reembolso parcial",
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
};

const METHOD_LABELS: Record<string, string> = {
  stripe_card: "Tarjeta (Stripe)",
  stripe_oxxo: "OXXO (Stripe)",
  mercadopago_card: "Tarjeta (MP)",
  mercadopago_oxxo: "OXXO (MP)",
  mercadopago_spei: "SPEI (MP)",
  mercadopago_wallet: "Wallet (MP)",
  cash: "Efectivo",
  corporate_invoice: "Factura corp.",
  loyalty_redemption: "Puntos",
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchPayments() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("payments")
        .select(
          "id, amount, currency, status, payment_type, payment_method, payment_provider, description, created_at"
        )
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });

      setPayments((data || []) as PaymentRow[]);
      setLoading(false);
    }

    fetchPayments();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de pagos</h1>
        <p className="text-muted-foreground">
          Consulta todos tus pagos y su estado.
        </p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aun no tienes pagos registrados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => {
            const status =
              STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
            return (
              <Card key={payment.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold">
                          {formatMXN(payment.amount)}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(payment.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {METHOD_LABELS[payment.payment_method] ||
                        payment.payment_method}
                    </Badge>
                  </div>
                  {payment.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {payment.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">{payment.payment_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
