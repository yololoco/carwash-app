-- myWash: Row Level Security policies for foundation tables
-- Slice 0: Database Foundation

-- ============ PROFILES ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Location managers can view profiles of staff and customers at their locations
CREATE POLICY "Managers can view location profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff ls
      WHERE ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
        AND (
          -- Staff at this location
          id IN (SELECT user_id FROM location_staff WHERE location_id = ls.location_id)
        )
    )
  );

-- Car washers can view profiles of customers assigned to them (via bookings - added later)
-- For now, washers can view their own profile (covered by "Users can view own profile")

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (role changes, etc.)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ LOCATIONS ============
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active locations
CREATE POLICY "Authenticated users can view active locations"
  ON locations FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can view ALL locations (including inactive)
CREATE POLICY "Admins can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create locations
CREATE POLICY "Admins can create locations"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any location
CREATE POLICY "Admins can update locations"
  ON locations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers can update their assigned locations
CREATE POLICY "Managers can update their locations"
  ON locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid()
        AND location_id = locations.id
        AND role = 'location_manager'
        AND is_active = true
    )
  );

-- ============ LOCATION OPERATING HOURS ============
ALTER TABLE location_operating_hours ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read operating hours
CREATE POLICY "Authenticated users can view operating hours"
  ON location_operating_hours FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage operating hours
CREATE POLICY "Admins can manage operating hours"
  ON location_operating_hours FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers can manage their location's operating hours
CREATE POLICY "Managers can manage their location hours"
  ON location_operating_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid()
        AND location_id = location_operating_hours.location_id
        AND role = 'location_manager'
        AND is_active = true
    )
  );

-- ============ LOCATION SPECIAL HOURS ============
ALTER TABLE location_special_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view special hours"
  ON location_special_hours FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage special hours"
  ON location_special_hours FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers can manage their location special hours"
  ON location_special_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid()
        AND location_id = location_special_hours.location_id
        AND role = 'location_manager'
        AND is_active = true
    )
  );

-- ============ LOCATION STAFF ============
ALTER TABLE location_staff ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with staff assignments
CREATE POLICY "Admins can manage all staff"
  ON location_staff FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers can view staff at their locations
CREATE POLICY "Managers can view their location staff"
  ON location_staff FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff ls
      WHERE ls.user_id = auth.uid()
        AND ls.location_id = location_staff.location_id
        AND ls.role = 'location_manager'
        AND ls.is_active = true
    )
  );

-- Staff can view their own assignments
CREATE POLICY "Staff can view own assignments"
  ON location_staff FOR SELECT
  USING (user_id = auth.uid());

-- ============ APP SETTINGS ============
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
