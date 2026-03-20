-- myWash: Quality surveys and disputes
-- Slice 6: Quality Surveys + Disputes

CREATE TABLE quality_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  washer_id UUID NOT NULL REFERENCES profiles(id),
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  comments TEXT,
  would_recommend BOOLEAN,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX idx_surveys_customer ON quality_surveys(customer_id);
CREATE INDEX idx_surveys_washer ON quality_surveys(washer_id);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  wash_session_id UUID REFERENCES wash_sessions(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_customer ON disputes(customer_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: update washer stats after survey
CREATE OR REPLACE FUNCTION update_washer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE washer_profiles
  SET
    avg_rating = (
      SELECT COALESCE(AVG(overall_rating)::DECIMAL(3,2), 0)
      FROM quality_surveys
      WHERE washer_id = NEW.washer_id
    ),
    total_washes = (
      SELECT COUNT(*)
      FROM wash_sessions
      WHERE washer_id = NEW.washer_id AND completed_at IS NOT NULL
    ),
    updated_at = now()
  WHERE user_id = NEW.washer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_survey_submitted
  AFTER INSERT ON quality_surveys
  FOR EACH ROW EXECUTE FUNCTION update_washer_stats();
