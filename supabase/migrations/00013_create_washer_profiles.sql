-- myWash: Washer profiles and availability
-- Slice 3: Bookings + Scheduling Engine

CREATE TABLE washer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  can_do_detailing BOOLEAN NOT NULL DEFAULT false,
  can_do_ceramic BOOLEAN NOT NULL DEFAULT false,
  specializations TEXT[],
  default_availability JSONB,
  -- Performance (updated via triggers later)
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_washes INTEGER DEFAULT 0,
  avg_wash_duration_minutes DECIMAL(5,1) DEFAULT 0,
  material_efficiency_score DECIMAL(5,2) DEFAULT 0,
  -- Employment
  hire_date DATE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  unavailable_reason TEXT,
  unavailable_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER washer_profiles_updated_at
  BEFORE UPDATE ON washer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Washer availability overrides (sick days, vacations)
CREATE TABLE washer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  washer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(washer_id, date)
);

CREATE INDEX idx_washer_availability_date ON washer_availability(washer_id, date);
