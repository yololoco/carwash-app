-- myWash: RLS for wash sessions, evidence photos, damage reports
-- Slice 4: Wash Execution

-- ============ WASH SESSIONS ============
ALTER TABLE wash_sessions ENABLE ROW LEVEL SECURITY;

-- Washers see their own sessions
CREATE POLICY "Washers see own sessions"
  ON wash_sessions FOR SELECT
  USING (auth.uid() = washer_id);

-- Customers see sessions for their bookings
CREATE POLICY "Customers see own booking sessions"
  ON wash_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = wash_sessions.booking_id
        AND bookings.customer_id = auth.uid()
    )
  );

-- Admins see all
CREATE POLICY "Admins see all sessions"
  ON wash_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Managers see location sessions
CREATE POLICY "Managers see location sessions"
  ON wash_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN location_staff ls ON ls.location_id = b.location_id
      WHERE b.id = wash_sessions.booking_id
        AND ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );

-- Washers can create sessions (start wash)
CREATE POLICY "Washers create sessions"
  ON wash_sessions FOR INSERT
  WITH CHECK (auth.uid() = washer_id);

-- Washers can update their sessions (complete wash)
CREATE POLICY "Washers update own sessions"
  ON wash_sessions FOR UPDATE
  USING (auth.uid() = washer_id);

-- ============ EVIDENCE PHOTOS ============
ALTER TABLE evidence_photos ENABLE ROW LEVEL SECURITY;

-- Washers upload photos for their sessions
CREATE POLICY "Washers upload photos"
  ON evidence_photos FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM wash_sessions WHERE id = wash_session_id AND washer_id = auth.uid()
    )
  );

-- Washers see their session photos
CREATE POLICY "Washers see own photos"
  ON evidence_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wash_sessions WHERE id = wash_session_id AND washer_id = auth.uid()
    )
  );

-- Customers see photos for their bookings
CREATE POLICY "Customers see booking photos"
  ON evidence_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wash_sessions ws
      JOIN bookings b ON b.id = ws.booking_id
      WHERE ws.id = wash_session_id AND b.customer_id = auth.uid()
    )
  );

-- Admins see all photos
CREATE POLICY "Admins see all photos"
  ON evidence_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Managers see location photos
CREATE POLICY "Managers see location photos"
  ON evidence_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wash_sessions ws
      JOIN bookings b ON b.id = ws.booking_id
      JOIN location_staff ls ON ls.location_id = b.location_id
      WHERE ws.id = wash_session_id
        AND ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );

-- ============ DAMAGE REPORTS ============
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Washers create damage reports
CREATE POLICY "Washers create damage reports"
  ON damage_reports FOR INSERT
  WITH CHECK (
    auth.uid() = reported_by
    AND EXISTS (
      SELECT 1 FROM wash_sessions WHERE id = wash_session_id AND washer_id = auth.uid()
    )
  );

-- Washers see their session damage reports
CREATE POLICY "Washers see own damage reports"
  ON damage_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wash_sessions WHERE id = wash_session_id AND washer_id = auth.uid()
    )
  );

-- Customers see damage reports for their bookings
CREATE POLICY "Customers see own damage reports"
  ON damage_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wash_sessions ws
      JOIN bookings b ON b.id = ws.booking_id
      WHERE ws.id = wash_session_id AND b.customer_id = auth.uid()
    )
  );

-- Admins see all
CREATE POLICY "Admins manage damage reports"
  ON damage_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
