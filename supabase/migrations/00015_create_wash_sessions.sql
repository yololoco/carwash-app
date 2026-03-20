-- myWash: Wash sessions, evidence photos, and damage reports
-- Slice 4: Wash Execution

CREATE TABLE wash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  washer_id UUID NOT NULL REFERENCES profiles(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  pre_wash_photos_uploaded BOOLEAN NOT NULL DEFAULT false,
  post_wash_photos_uploaded BOOLEAN NOT NULL DEFAULT false,
  washer_notes TEXT,
  labor_cost DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wash_sessions_booking ON wash_sessions(booking_id);
CREATE INDEX idx_wash_sessions_washer ON wash_sessions(washer_id);

CREATE TRIGGER wash_sessions_updated_at
  BEFORE UPDATE ON wash_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Evidence photos
CREATE TABLE evidence_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pre_wash', 'post_wash', 'damage', 'upsell')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  annotations JSONB,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_photos_session ON evidence_photos(wash_session_id);
CREATE INDEX idx_evidence_photos_type ON evidence_photos(wash_session_id, photo_type);

-- Damage reports
CREATE TABLE damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe')),
  photo_ids UUID[],
  is_pre_existing BOOLEAN NOT NULL DEFAULT true,
  location_on_car TEXT,
  acknowledged_by_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_damage_reports_session ON damage_reports(wash_session_id);

-- Enable Supabase Realtime on bookings for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
