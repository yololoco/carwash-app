-- myWash: RLS for bookings, templates, waitlist, washer profiles
-- Slice 3: Bookings + Scheduling Engine

-- ============ BOOKINGS ============
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Washers see assigned bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = assigned_washer_id);

CREATE POLICY "Admins see all bookings"
  ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers see location bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND role = 'location_manager'
        AND location_id = bookings.location_id AND is_active = true
    )
  );

-- Admins and system (service_role) can insert bookings
CREATE POLICY "Admins can manage bookings"
  ON bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Customers can create one-time bookings
CREATE POLICY "Customers create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update own (cancel)
CREATE POLICY "Customers update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = customer_id);

-- Washers can update assigned bookings (status changes)
CREATE POLICY "Washers update assigned bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = assigned_washer_id);

-- Managers can update location bookings (reassign, etc.)
CREATE POLICY "Managers update location bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND role = 'location_manager'
        AND location_id = bookings.location_id AND is_active = true
    )
  );

-- ============ CUSTOM WASH TEMPLATES ============
ALTER TABLE custom_wash_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own templates"
  ON custom_wash_templates FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ============ WAITLIST ============
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own waitlist"
  ON waitlist FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins manage waitlist"
  ON waitlist FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ WASHER PROFILES ============
ALTER TABLE washer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Washers see own profile"
  ON washer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Washers update own profile"
  ON washer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage washer profiles"
  ON washer_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers see location washer profiles"
  ON washer_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff ls
      JOIN location_staff ws ON ws.user_id = washer_profiles.user_id
      WHERE ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.location_id = ws.location_id
        AND ls.is_active = true
    )
  );

-- ============ WASHER AVAILABILITY ============
ALTER TABLE washer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Washers manage own availability"
  ON washer_availability FOR ALL
  USING (auth.uid() = washer_id)
  WITH CHECK (auth.uid() = washer_id);

CREATE POLICY "Admins manage availability"
  ON washer_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers read location washer availability"
  ON washer_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff ls
      JOIN location_staff ws ON ws.user_id = washer_availability.washer_id
      WHERE ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.location_id = ws.location_id
        AND ls.is_active = true
    )
  );
