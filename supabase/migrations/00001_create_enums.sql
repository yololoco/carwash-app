-- myWash: All application enums
-- Slice 0: Database Foundation

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'location_manager', 'car_washer', 'customer');

-- Location types
CREATE TYPE location_type AS ENUM ('office_building', 'residential_building');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'past_due', 'trialing');

-- Booking status
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'washer_en_route',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'weather_delayed',
  'rescheduled'
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- Wash frequency
CREATE TYPE wash_frequency AS ENUM ('daily', 'twice_weekly', 'weekly', 'biweekly', 'monthly', 'one_time');

-- Inventory transaction type
CREATE TYPE inventory_tx_type AS ENUM ('restock', 'usage', 'adjustment', 'transfer', 'waste');

-- Notification type
CREATE TYPE notification_type AS ENUM (
  'wash_scheduled', 'wash_started', 'wash_completed', 'wash_cancelled',
  'evidence_uploaded', 'upsell_offer', 'survey_request', 'payment_succeeded',
  'payment_failed', 'subscription_renewed', 'low_stock_alert', 'daily_offer',
  'damage_report', 'message_received', 'general'
);

-- Day of week
CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');

-- Dispute status
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_customer', 'resolved_business', 'closed');

-- Offer status (residential model)
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Payment method
CREATE TYPE payment_method AS ENUM (
  'stripe_card',
  'stripe_oxxo',
  'mercadopago_card',
  'mercadopago_oxxo',
  'mercadopago_spei',
  'mercadopago_wallet',
  'cash',
  'corporate_invoice',
  'loyalty_redemption'
);
