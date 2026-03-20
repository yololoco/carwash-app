// Price calculator for one-time bookings and emergency washes

interface PriceBreakdown {
  basePrice: number;
  premiumFees: number;
  discountAmount: number;
  totalPrice: number;
  details: { label: string; amount: number }[];
}

interface ServicePrice {
  id: string;
  name: string;
  // We use estimated_duration_minutes as a proxy for pricing if no explicit price
  // In practice, services are bundled into packages with base_price
}

interface PremiumFee {
  name: string;
  fee_type: string;
  amount: number | null;
  percentage: number | null;
}

export function calculateBookingPrice(params: {
  basePrice: number;
  isEmergency: boolean;
  isOneTime: boolean;
  premiumFees: PremiumFee[];
  discountPct: number;
}): PriceBreakdown {
  const { basePrice, isEmergency, isOneTime, premiumFees, discountPct } = params;
  const details: { label: string; amount: number }[] = [];

  details.push({ label: "Precio base", amount: basePrice });

  let totalPremium = 0;

  for (const fee of premiumFees) {
    if (!fee.amount && !fee.percentage) continue;

    // Apply emergency fees
    if (fee.fee_type === "emergency" && isEmergency) {
      const feeAmount = fee.amount || (fee.percentage ? basePrice * fee.percentage / 100 : 0);
      totalPremium += feeAmount;
      details.push({ label: fee.name, amount: feeAmount });
    }

    // Apply one-time surcharge
    if (fee.fee_type === "one_time_surcharge" && isOneTime) {
      const feeAmount = fee.amount || (fee.percentage ? basePrice * fee.percentage / 100 : 0);
      totalPremium += feeAmount;
      details.push({ label: fee.name, amount: feeAmount });
    }

    // Apply time-slot or peak-hour fees (would check conditions in production)
    if (fee.fee_type === "time_slot" || fee.fee_type === "peak_hour") {
      const feeAmount = fee.amount || (fee.percentage ? basePrice * fee.percentage / 100 : 0);
      totalPremium += feeAmount;
      details.push({ label: fee.name, amount: feeAmount });
    }
  }

  const subtotal = basePrice + totalPremium;
  const discountAmount = discountPct > 0 ? subtotal * discountPct / 100 : 0;

  if (discountAmount > 0) {
    details.push({ label: `Descuento (${discountPct}%)`, amount: -discountAmount });
  }

  return {
    basePrice,
    premiumFees: totalPremium,
    discountAmount,
    totalPrice: Math.max(0, subtotal - discountAmount),
    details,
  };
}
