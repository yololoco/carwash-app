// Phase 2: Subscription flow — kept for future reactivation.
// The app has pivoted to an on-demand marketplace model.
// This endpoint is NOT linked from any active navigation but remains
// functional for direct URL access and legacy subscription pages.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { createPreapproval } from "@/lib/mercadopago/client";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    package_id,
    car_id,
    location_id,
    payment_provider,
    preferred_days,
    preferred_time_start,
    preferred_time_end,
  } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Get package details
  const { data: pkg } = await admin
    .from("wash_packages")
    .select("*")
    .eq("id", package_id)
    .single();

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  // Check for location-specific pricing
  const { data: locPricing } = await admin
    .from("package_location_pricing")
    .select("price")
    .eq("package_id", package_id)
    .eq("location_id", location_id)
    .single();

  const price = locPricing?.price || pkg.base_price;

  // Get or create profile payment IDs
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id, mercadopago_customer_id")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Create subscription record first (pending)
  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .insert({
      customer_id: profile.id,
      car_id,
      package_id,
      location_id,
      status: "trialing",
      payment_provider,
      preferred_days: preferred_days || null,
      preferred_time_start: preferred_time_start || null,
      preferred_time_end: preferred_time_end || null,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (subError || !subscription) {
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ──── STRIPE ────
  if (payment_provider === "stripe") {
    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: { supabase_id: profile.id },
      });
      stripeCustomerId = customer.id;
      await admin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", profile.id);
    }

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: pkg.name,
              description: pkg.description || undefined,
            },
            unit_amount: Math.round(price * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          subscription_id: subscription.id,
          customer_id: profile.id,
        },
      },
      metadata: { customer_id: profile.id },
      success_url: `${appUrl}/subscriptions?success=true`,
      cancel_url: `${appUrl}/subscribe/${package_id}?cancelled=true`,
    });

    return NextResponse.json({ checkout_url: session.url });
  }

  // ──── MERCADOPAGO ────
  if (payment_provider === "mercadopago") {
    const preapproval = await createPreapproval({
      reason: `myWash - ${pkg.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: price,
        currency_id: "MXN",
      },
      payer_email: profile.email,
      back_url: `${appUrl}/subscriptions?success=true`,
      external_reference: subscription.id,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    });

    if (preapproval.id) {
      await admin
        .from("subscriptions")
        .update({ external_subscription_id: preapproval.id })
        .eq("id", subscription.id);
    }

    return NextResponse.json({ checkout_url: preapproval.init_point });
  }

  // ──── CASH ────
  if (payment_provider === "cash") {
    await admin
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscription.id);

    await admin.from("payments").insert({
      customer_id: profile.id,
      subscription_id: subscription.id,
      payment_provider: "cash",
      payment_method: "cash",
      amount: price,
      currency: "MXN",
      status: "pending",
      payment_type: "subscription",
      description: `Suscripcion ${pkg.name} - Pago en efectivo`,
    });

    return NextResponse.json({ checkout_url: null, cash: true });
  }

  return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
}
