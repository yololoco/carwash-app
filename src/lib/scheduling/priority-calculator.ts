// Priority score calculation for fair scheduling
// Higher score = higher priority in the daily queue

interface BookingInput {
  subscription_id: string | null;
  customer_id: string;
  car_id: string;
  is_one_time: boolean;
  is_emergency: boolean;
  rescheduled_from: string | null;
  created_at: string;
}

interface SchedulingContext {
  daysSinceLastWash: number;
  expectedFrequencyDays: number;
  customerTenureMonths: number;
  fromWaitlist: boolean;
}

export function calculatePriorityScore(
  booking: BookingInput,
  context: SchedulingContext
): number {
  let score = 0;

  // 1. Base priority by type
  if (booking.is_emergency) {
    score += 10000;
  } else if (!booking.is_one_time) {
    score += 1000; // Subscribers > one-time
  }

  // 2. Subscription freshness (overdue customers get boosted)
  if (booking.subscription_id && context.expectedFrequencyDays > 0) {
    const urgencyRatio = context.daysSinceLastWash / context.expectedFrequencyDays;
    score += urgencyRatio * 500;
  }

  // 3. Customer tenure bonus (max 50 points)
  score += Math.min(context.customerTenureMonths * 5, 50);

  // 4. Rescheduled bookings get a boost
  if (booking.rescheduled_from) {
    score += 200;
  }

  // 5. Waitlist priority
  if (context.fromWaitlist) {
    score += 100;
  }

  // 6. One-time bookings: earlier creation = higher priority (FIFO)
  if (booking.is_one_time) {
    const hoursAgo =
      (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60);
    score += Math.min(hoursAgo * 10, 100);
  }

  return Math.round(score * 100) / 100;
}

// Frequency enum to days mapping
export function frequencyToDays(frequency: string): number {
  switch (frequency) {
    case "daily": return 1;
    case "twice_weekly": return 3.5;
    case "weekly": return 7;
    case "biweekly": return 14;
    case "monthly": return 30;
    default: return 7;
  }
}

// Check if a given date matches the subscription's preferred days
export function shouldWashOnDate(
  preferredDays: string[] | null,
  frequency: string,
  date: Date,
  lastWashDate: Date | null
): boolean {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayDay = dayNames[date.getDay()];

  // If preferred days are set, check if today is one of them
  if (preferredDays && preferredDays.length > 0) {
    if (!preferredDays.includes(todayDay)) return false;
  }

  // Check frequency: don't schedule if last wash was too recent
  if (lastWashDate) {
    const daysSinceLast = Math.floor(
      (date.getTime() - lastWashDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const minDays = frequencyToDays(frequency);
    // Allow wash if at least 80% of the frequency has passed
    if (daysSinceLast < minDays * 0.8) return false;
  }

  return true;
}
