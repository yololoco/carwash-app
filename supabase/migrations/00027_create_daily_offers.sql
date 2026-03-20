-- myWash: Daily offers (residential model)
-- Slice 11: Residential Model

CREATE TABLE daily_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  offer_date DATE NOT NULL,
  message TEXT NOT NULL,
  packages_available UUID[],
  discount_pct DECIMAL(5,2) DEFAULT 0,
  min_cars_threshold INTEGER NOT NULL,
  current_responses INTEGER NOT NULL DEFAULT 0,
  threshold_met BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, offer_date)
);

CREATE TABLE daily_offer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES daily_offers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  status offer_status NOT NULL DEFAULT 'pending',
  booking_id UUID REFERENCES bookings(id),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_id, car_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE daily_offer_responses;

-- Trigger: update offer response count
CREATE OR REPLACE FUNCTION update_offer_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE daily_offers
  SET
    current_responses = (
      SELECT COUNT(*) FROM daily_offer_responses
      WHERE offer_id = NEW.offer_id AND status = 'accepted'
    ),
    threshold_met = (
      (SELECT COUNT(*) FROM daily_offer_responses
       WHERE offer_id = NEW.offer_id AND status = 'accepted')
      >= min_cars_threshold
    )
  WHERE id = NEW.offer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_offer_response
  AFTER INSERT OR UPDATE ON daily_offer_responses
  FOR EACH ROW EXECUTE FUNCTION update_offer_response_count();
