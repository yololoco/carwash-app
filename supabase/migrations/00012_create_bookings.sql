-- myWash: Bookings, custom wash templates, and waitlist
-- Slice 3: Bookings + Scheduling Engine

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  package_id UUID REFERENCES wash_packages(id),
  services UUID[] NOT NULL,
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  -- Assignment
  assigned_washer_id UUID REFERENCES profiles(id),
  -- Status
  status booking_status NOT NULL DEFAULT 'pending',
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  premium_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  is_one_time BOOLEAN NOT NULL DEFAULT false,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  -- Template
  template_id UUID,
  -- Queue
  queue_position INTEGER,
  priority_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Metadata
  customer_notes TEXT,
  internal_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  no_show_at TIMESTAMPTZ,
  rescheduled_from UUID REFERENCES bookings(id),
  weather_delay_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_date_location ON bookings(scheduled_date, location_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_washer ON bookings(assigned_washer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_subscription ON bookings(subscription_id);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Custom wash templates (customer's saved wash preferences)
CREATE TABLE custom_wash_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  services UUID[] NOT NULL,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_customer ON custom_wash_templates(customer_id);

-- Waitlist
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  desired_date DATE NOT NULL,
  desired_time_start TIME,
  desired_time_end TIME,
  package_id UUID REFERENCES wash_packages(id),
  services UUID[],
  is_notified BOOLEAN NOT NULL DEFAULT false,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, car_id, location_id, desired_date)
);
