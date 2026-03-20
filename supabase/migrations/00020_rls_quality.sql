-- myWash: RLS for quality surveys and disputes
-- Slice 6: Quality Surveys + Disputes

-- ============ QUALITY SURVEYS ============
ALTER TABLE quality_surveys ENABLE ROW LEVEL SECURITY;

-- Customers insert surveys for own bookings
CREATE POLICY "Customers insert own surveys"
  ON quality_surveys FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND customer_id = auth.uid())
  );

-- Customers read own surveys
CREATE POLICY "Customers read own surveys"
  ON quality_surveys FOR SELECT
  USING (auth.uid() = customer_id);

-- Washers read surveys about them
CREATE POLICY "Washers read own surveys"
  ON quality_surveys FOR SELECT
  USING (auth.uid() = washer_id);

-- Admins read all
CREATE POLICY "Admins read all surveys"
  ON quality_surveys FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Managers read location surveys
CREATE POLICY "Managers read location surveys"
  ON quality_surveys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN location_staff ls ON ls.location_id = b.location_id
      WHERE b.id = quality_surveys.booking_id
        AND ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );

-- ============ DISPUTES ============
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Customers create disputes for own bookings
CREATE POLICY "Customers create own disputes"
  ON disputes FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND customer_id = auth.uid())
  );

-- Customers read own disputes
CREATE POLICY "Customers read own disputes"
  ON disputes FOR SELECT
  USING (auth.uid() = customer_id);

-- Admins manage all disputes
CREATE POLICY "Admins manage disputes"
  ON disputes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Managers read and update location disputes
CREATE POLICY "Managers manage location disputes"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN location_staff ls ON ls.location_id = b.location_id
      WHERE b.id = disputes.booking_id
        AND ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );

CREATE POLICY "Managers update location disputes"
  ON disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN location_staff ls ON ls.location_id = b.location_id
      WHERE b.id = disputes.booking_id
        AND ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );
