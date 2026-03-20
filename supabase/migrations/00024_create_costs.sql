-- myWash: Cost records
-- Slice 9: Inventory + Cost Tracking

CREATE TABLE cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  labor_minutes INTEGER NOT NULL,
  labor_rate_per_hour DECIMAL(10,2) NOT NULL,
  labor_cost DECIMAL(10,2) NOT NULL,
  material_cost DECIMAL(10,2) NOT NULL,
  overhead_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL,
  revenue DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  margin_pct DECIMAL(5,2),
  material_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_records_session ON cost_records(wash_session_id);
CREATE INDEX idx_cost_records_location ON cost_records(location_id);
CREATE INDEX idx_cost_records_created ON cost_records(created_at);
