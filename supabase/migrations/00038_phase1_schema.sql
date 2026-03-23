-- myWash Phase 1: Cuota + On-Demand Marketplace
-- Combined migration for all Phase 1 schema changes

-- New enum for cuota status
CREATE TYPE cuota_status AS ENUM ('pending', 'paid', 'waived', 'cancelled');

-- Add cuota/commission settings to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS daily_cuota_amount DECIMAL(10,2) DEFAULT 200;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accepts_on_demand BOOLEAN NOT NULL DEFAULT true;

-- Washer daily cuota payments
CREATE TABLE washer_cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  washer_id TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status cuota_status NOT NULL DEFAULT 'pending',
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(washer_id, location_id, date)
);

CREATE INDEX idx_cuotas_date ON washer_cuotas(date);
CREATE INDEX idx_cuotas_washer ON washer_cuotas(washer_id);
CREATE INDEX idx_cuotas_status ON washer_cuotas(status);

CREATE TRIGGER washer_cuotas_updated_at
  BEFORE UPDATE ON washer_cuotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- On-demand booking fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_on_demand BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS broadcast_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS washer_earnings DECIMAL(10,2) DEFAULT 0;

-- Track washer responses to broadcast requests
CREATE TABLE wash_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  washer_id TEXT NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('accepted', 'rejected', 'expired')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, washer_id)
);

-- Enable Realtime on cuotas and request responses
ALTER PUBLICATION supabase_realtime ADD TABLE washer_cuotas;
ALTER PUBLICATION supabase_realtime ADD TABLE wash_request_responses;

-- Phase 1 app settings
INSERT INTO app_settings (key, value, description) VALUES
  ('default_commission_rate', '15', 'Default commission % for app-booked washes'),
  ('broadcast_timeout_minutes', '10', 'Minutes before wash request expires'),
  ('phase1_active', 'true', 'Phase 1 cuota + on-demand model active')
ON CONFLICT (key, location_id) DO NOTHING;

-- Update seed locations with cuota amounts
UPDATE locations SET daily_cuota_amount = 200, commission_rate = 15 WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE locations SET daily_cuota_amount = 150, commission_rate = 15 WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- RLS for new tables
ALTER TABLE washer_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_request_responses ENABLE ROW LEVEL SECURITY;

-- Cuota RLS
CREATE POLICY "Washers see own cuotas" ON washer_cuotas FOR SELECT
  USING (washer_id = (SELECT id::TEXT FROM profiles WHERE clerk_id = (auth.jwt()->>'sub')::TEXT LIMIT 1));
CREATE POLICY "Washers create cuota requests" ON washer_cuotas FOR INSERT
  WITH CHECK (washer_id = (SELECT id::TEXT FROM profiles WHERE clerk_id = (auth.jwt()->>'sub')::TEXT LIMIT 1));
CREATE POLICY "Admins manage cuotas" ON washer_cuotas FOR ALL USING (is_admin());
CREATE POLICY "Managers manage location cuotas" ON washer_cuotas FOR ALL
  USING (is_manager_at(location_id));

-- Request responses RLS
CREATE POLICY "Washers manage own responses" ON wash_request_responses FOR ALL
  USING (washer_id = (SELECT id::TEXT FROM profiles WHERE clerk_id = (auth.jwt()->>'sub')::TEXT LIMIT 1));
CREATE POLICY "Admins see all responses" ON wash_request_responses FOR SELECT USING (is_admin());

-- Analytics views
CREATE OR REPLACE VIEW washer_daily_earnings AS
SELECT
  b.assigned_washer_id AS washer_id,
  b.scheduled_date,
  COUNT(*) FILTER (WHERE b.status = 'completed') AS washes_completed,
  COALESCE(SUM(b.washer_earnings) FILTER (WHERE b.status = 'completed'), 0) AS total_earnings,
  COALESCE(SUM(b.commission_amount) FILTER (WHERE b.status = 'completed'), 0) AS total_commission
FROM bookings b
WHERE b.is_on_demand = true AND b.assigned_washer_id IS NOT NULL
GROUP BY b.assigned_washer_id, b.scheduled_date;

CREATE OR REPLACE VIEW cuota_revenue_summary AS
SELECT
  wc.location_id,
  wc.date,
  COUNT(*) FILTER (WHERE wc.status = 'paid') AS cuotas_paid,
  COALESCE(SUM(wc.amount) FILTER (WHERE wc.status = 'paid'), 0) AS cuota_revenue
FROM washer_cuotas wc
GROUP BY wc.location_id, wc.date;
