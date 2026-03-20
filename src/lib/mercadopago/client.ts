// MercadoPago API client
// Uses direct REST API calls (lighter than the full SDK)

const MP_BASE_URL = "https://api.mercadopago.com";

async function mpFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MP_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      ...options.headers,
    },
  });
  return res.json();
}

export async function createPreference(data: {
  items: { title: string; unit_price: number; quantity: number; currency_id: string }[];
  payer: { email: string };
  back_urls: { success: string; failure: string; pending: string };
  auto_return: string;
  external_reference: string;
  notification_url?: string;
}) {
  return mpFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createPreapproval(data: {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "months" | "days";
    transaction_amount: number;
    currency_id: string;
  };
  payer_email: string;
  back_url: string;
  external_reference: string;
  notification_url?: string;
}) {
  return mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPayment(paymentId: string) {
  return mpFetch(`/v1/payments/${paymentId}`);
}

export async function getPreapproval(preapprovalId: string) {
  return mpFetch(`/preapproval/${preapprovalId}`);
}
