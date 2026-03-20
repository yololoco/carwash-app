-- myWash: Subscriptions table
-- Slice 2: Subscriptions + Payments

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES wash_packages(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status subscription_status NOT NULL DEFAULT 'active',
  payment_provider TEXT NOT NULL DEFAULT 'mercadopago' CHECK (payment_provider IN ('stripe', 'mercadopago', 'cash')),
  external_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  -- Scheduling preferences
  preferred_days day_of_week[],
  preferred_time_start TIME,
  preferred_time_end TIME,
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  -- Pause
  paused_at TIMESTAMPTZ,
  resume_at TIMESTAMPTZ,
  -- Stats
  total_washes_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_location ON subscriptions(location_id);
CREATE INDEX idx_subscriptions_car ON subscriptions(car_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
