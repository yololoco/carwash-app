import { NextRequest, NextResponse } from "next/server";
import { getPayment, getPreapproval } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  try {
    const { type, data } = body;

    if (type === "payment" && data?.id) {
      const payment = await getPayment(String(data.id));

      if (!payment || !payment.external_reference) {
        return NextResponse.json({ received: true });
      }

      // external_reference = our subscription_id or booking_id
      const externalRef = payment.external_reference;

      const statusMap: Record<string, string> = {
        approved: "succeeded",
        pending: "pending",
        in_process: "pending",
        rejected: "failed",
        refunded: "refunded",
        cancelled: "failed",
      };

      const mpStatus = statusMap[payment.status] || "pending";

      // Determine payment_method from MP payment type
      let paymentMethod = "mercadopago_card";
      if (payment.payment_type_id === "ticket") paymentMethod = "mercadopago_oxxo";
      else if (payment.payment_type_id === "bank_transfer") paymentMethod = "mercadopago_spei";
      else if (payment.payment_type_id === "account_money") paymentMethod = "mercadopago_wallet";

      // Check if this payment already exists
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("external_payment_id", String(payment.id))
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from("payments")
          .update({ status: mpStatus })
          .eq("id", existing.id);
      } else {
        // Find customer from subscription
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id, customer_id")
          .eq("id", externalRef)
          .single();

        if (sub) {
          await supabase.from("payments").insert({
            customer_id: sub.customer_id,
            subscription_id: sub.id,
            payment_provider: "mercadopago",
            payment_method: paymentMethod,
            external_payment_id: String(payment.id),
            amount: payment.transaction_amount || 0,
            currency: "MXN",
            status: mpStatus,
            payment_type: "subscription",
            description: `Pago MercadoPago #${payment.id}`,
          });
        }
      }
    }

    if (type === "subscription_preapproval" && data?.id) {
      const preapproval = await getPreapproval(String(data.id));

      if (!preapproval || !preapproval.external_reference) {
        return NextResponse.json({ received: true });
      }

      const statusMap: Record<string, string> = {
        authorized: "active",
        paused: "paused",
        cancelled: "cancelled",
        pending: "trialing",
      };

      await supabase
        .from("subscriptions")
        .update({
          status: statusMap[preapproval.status] || "active",
          external_subscription_id: String(preapproval.id),
        })
        .eq("id", preapproval.external_reference);
    }
  } catch (err) {
    console.error("MercadoPago webhook error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
