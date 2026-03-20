// Auto-generate with: npx supabase gen types typescript --linked > src/types/database.ts
// Manual types for development until Supabase is connected.

export type UserRole = "admin" | "location_manager" | "car_washer" | "customer";
export type LocationType = "office_building" | "residential_building";
export type SubscriptionStatus = "active" | "paused" | "cancelled" | "past_due" | "trialing";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "washer_en_route"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "weather_delayed"
  | "rescheduled";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
export type PaymentProvider = "stripe" | "mercadopago" | "cash" | "corporate" | "loyalty";
export type PaymentMethod =
  | "stripe_card"
  | "stripe_oxxo"
  | "mercadopago_card"
  | "mercadopago_oxxo"
  | "mercadopago_spei"
  | "mercadopago_wallet"
  | "cash"
  | "corporate_invoice"
  | "loyalty_redemption";
export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

// ─── Row types ───────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  stripe_customer_id: string | null;
  mercadopago_customer_id: string | null;
  preferred_payment_method: PaymentMethod | null;
  push_token: string | null;
  preferred_language: string;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  location_type: LocationType;
  timezone: string;
  is_active: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  min_cars_threshold: number | null;
  offer_expiry_minutes: number | null;
  max_daily_capacity: number;
  parking_instructions: string | null;
  access_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationOperatingHours {
  id: string;
  location_id: string;
  day_of_week: DayOfWeek;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface LocationSpecialHours {
  id: string;
  location_id: string;
  date: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  reason: string | null;
}

export interface LocationStaff {
  id: string;
  location_id: string;
  user_id: string;
  role: UserRole;
  is_primary: boolean;
  is_active: boolean;
  assigned_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  location_id: string | null;
  description: string | null;
  updated_at: string;
}

export interface Car {
  id: string;
  owner_id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  photo_url: string | null;
  is_active: boolean;
  notes: string | null;
  primary_location_id: string | null;
  parking_spot: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalog {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_add_on: boolean;
  estimated_duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WashPackage {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  included_services: string[];
  base_price: number;
  currency: string;
  is_location_specific: boolean;
  is_active: boolean;
  is_subscription: boolean;
  multi_car_discount_pct: number;
  max_cars_for_discount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageLocationPricing {
  id: string;
  package_id: string;
  location_id: string;
  price: number;
  currency: string;
}

export interface PremiumFee {
  id: string;
  name: string;
  fee_type: string;
  amount: number | null;
  percentage: number | null;
  location_id: string | null;
  is_active: boolean;
  conditions: unknown;
  created_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  car_id: string;
  package_id: string;
  location_id: string;
  status: SubscriptionStatus;
  payment_provider: string;
  external_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  preferred_days: DayOfWeek[] | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancel_at_period_end: boolean;
  paused_at: string | null;
  resume_at: string | null;
  total_washes_used: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  booking_id: string | null;
  subscription_id: string | null;
  payment_provider: PaymentProvider;
  payment_method: PaymentMethod;
  external_payment_id: string | null;
  external_invoice_id: string | null;
  external_subscription_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_type: string;
  description: string | null;
  refund_amount: number;
  refund_reason: string | null;
  cash_collected_by: string | null;
  cash_confirmed_by: string | null;
  cash_confirmed_at: string | null;
  tip_amount: number;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  car_id: string;
  location_id: string;
  subscription_id: string | null;
  package_id: string | null;
  services: string[];
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  assigned_washer_id: string | null;
  status: BookingStatus;
  base_price: number;
  premium_fees: number;
  discount_amount: number;
  total_price: number;
  currency: string;
  is_one_time: boolean;
  is_emergency: boolean;
  template_id: string | null;
  queue_position: number | null;
  priority_score: number;
  customer_notes: string | null;
  internal_notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  no_show_at: string | null;
  rescheduled_from: string | null;
  weather_delay_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomWashTemplate {
  id: string;
  customer_id: string;
  name: string;
  services: string[];
  notes: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Waitlist {
  id: string;
  customer_id: string;
  car_id: string;
  location_id: string;
  desired_date: string;
  desired_time_start: string | null;
  desired_time_end: string | null;
  package_id: string | null;
  services: string[] | null;
  is_notified: boolean;
  is_booked: boolean;
  created_at: string;
}

export interface WasherProfile {
  id: string;
  user_id: string;
  hourly_rate: number;
  can_do_detailing: boolean;
  can_do_ceramic: boolean;
  specializations: string[] | null;
  default_availability: unknown;
  avg_rating: number;
  total_washes: number;
  avg_wash_duration_minutes: number;
  material_efficiency_score: number;
  hire_date: string | null;
  is_available: boolean;
  unavailable_reason: string | null;
  unavailable_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface WasherAvailability {
  id: string;
  washer_id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface WashSession {
  id: string;
  booking_id: string;
  washer_id: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  pre_wash_photos_uploaded: boolean;
  post_wash_photos_uploaded: boolean;
  washer_notes: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  total_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface EvidencePhoto {
  id: string;
  wash_session_id: string;
  photo_type: "pre_wash" | "post_wash" | "damage" | "upsell";
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  annotations: unknown;
  taken_at: string;
  uploaded_by: string;
  created_at: string;
}

export interface DamageReport {
  id: string;
  wash_session_id: string;
  reported_by: string;
  description: string;
  severity: "minor" | "moderate" | "severe";
  photo_ids: string[] | null;
  is_pre_existing: boolean;
  location_on_car: string | null;
  acknowledged_by_customer: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  is_pushed: boolean;
  created_at: string;
}

export interface QualitySurvey {
  id: string;
  booking_id: string;
  wash_session_id: string;
  customer_id: string;
  washer_id: string;
  overall_rating: number;
  cleanliness_rating: number | null;
  timeliness_rating: number | null;
  communication_rating: number | null;
  comments: string | null;
  would_recommend: boolean | null;
  submitted_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  customer_id: string;
  wash_session_id: string | null;
  subject: string;
  description: string;
  status: "open" | "under_review" | "resolved_customer" | "resolved_business" | "closed";
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  metadata: unknown;
  is_read: boolean;
  created_at: string;
}

export interface UpsellOffer {
  id: string;
  booking_id: string;
  wash_session_id: string | null;
  washer_id: string;
  customer_id: string;
  service_id: string;
  message: string | null;
  price: number;
  status: "pending" | "accepted" | "declined" | "expired";
  responded_at: string | null;
  photo_url: string | null;
  created_at: string;
}

// ─── Supabase Database type ──────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string; full_name: string };
        Update: Partial<Profile>;
      };
      locations: {
        Row: Location;
        Insert: Omit<Location, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Location, "id" | "created_at" | "updated_at">>;
      };
      location_operating_hours: {
        Row: LocationOperatingHours;
        Insert: Omit<LocationOperatingHours, "id">;
        Update: Partial<Omit<LocationOperatingHours, "id">>;
      };
      location_special_hours: {
        Row: LocationSpecialHours;
        Insert: Omit<LocationSpecialHours, "id">;
        Update: Partial<Omit<LocationSpecialHours, "id">>;
      };
      location_staff: {
        Row: LocationStaff;
        Insert: Omit<LocationStaff, "id" | "assigned_at">;
        Update: Partial<Omit<LocationStaff, "id" | "assigned_at">>;
      };
      app_settings: {
        Row: AppSetting;
        Insert: Omit<AppSetting, "id" | "updated_at">;
        Update: Partial<Omit<AppSetting, "id" | "updated_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      location_type: LocationType;
      subscription_status: SubscriptionStatus;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      day_of_week: DayOfWeek;
    };
  };
}
