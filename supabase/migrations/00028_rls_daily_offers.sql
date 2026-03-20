-- myWash: RLS for daily offers
-- Slice 11

ALTER TABLE daily_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_offer_responses ENABLE ROW LEVEL SECURITY;

-- Customers at the location can see active offers
CREATE POLICY "Customers see location offers"
  ON daily_offers FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM cars
      WHERE cars.owner_id = auth.uid()
        AND cars.primary_location_id = daily_offers.location_id
        AND cars.is_active = true
    )
  );

CREATE POLICY "Admins manage offers"
  ON daily_offers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers manage location offers"
  ON daily_offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND location_id = daily_offers.location_id
        AND role = 'location_manager' AND is_active = true
    )
  );

-- Responses
CREATE POLICY "Customers manage own responses"
  ON daily_offer_responses FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins see all responses"
  ON daily_offer_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers see location responses"
  ON daily_offer_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_offers do2
      JOIN location_staff ls ON ls.location_id = do2.location_id
      WHERE do2.id = daily_offer_responses.offer_id
        AND ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );
