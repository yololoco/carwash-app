import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;
        const externalRef = sub.metadata?.subscription_id;
        if (!externalRef) break;

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "cancelled",
          paused: "paused",
          trialing: "trialing",
          unpaid: "past_due",
        };

        await supabase
          .from("subscriptions")
          .update({
            status: statusMap[sub.status] || "active",
            external_subscription_id: sub.id,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("id", externalRef);
        break;
      }

      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subDel = event.data.object as any;
        const externalRefDel = subDel.metadata?.subscription_id;
        if (!externalRefDel) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", externalRefDel);
        break;
      }

      case "invoice.payment_succeeded": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subId = (invoice.subscription as string) || null;
        const customerId = invoice.metadata?.customer_id;
        if (!customerId) break;

        // Find our subscription by external_subscription_id
        let subscriptionId: string | null = null;
        if (subId) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("external_subscription_id", subId)
            .single();
          subscriptionId = subRow?.id || null;
        }

        await supabase.from("payments").insert({
          customer_id: customerId,
          subscription_id: subscriptionId,
          payment_provider: "stripe",
          payment_method: "stripe_card",
          external_payment_id: invoice.payment_intent as string,
          external_invoice_id: invoice.id,
          external_subscription_id: subId,
          amount: (invoice.amount_paid || 0) / 100,
          currency: "MXN",
          status: "succeeded",
          payment_type: subId ? "subscription" : "one_time",
          description: `Pago ${invoice.number || invoice.id}`,
        });
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const customerId = invoice.metadata?.customer_id;
        if (!customerId) break;

        const subId = (invoice.subscription as string) || null;
        let subscriptionId: string | null = null;
        if (subId) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("external_subscription_id", subId)
            .single();
          subscriptionId = subRow?.id || null;

          if (subscriptionId) {
            await supabase
              .from("subscriptions")
              .update({ status: "past_due" })
              .eq("id", subscriptionId);
          }
        }

        await supabase.from("payments").insert({
          customer_id: customerId,
          subscription_id: subscriptionId,
          payment_provider: "stripe",
          payment_method: "stripe_card",
          external_payment_id: invoice.payment_intent as string,
          external_invoice_id: invoice.id,
          amount: (invoice.amount_due || 0) / 100,
          currency: "MXN",
          status: "failed",
          payment_type: "subscription",
          description: `Pago fallido ${invoice.number || invoice.id}`,
        });
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
