-- myWash: RLS for cars, services, packages, fees
-- Slice 1: Cars + Services + Packages

-- ============ CARS ============
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Customers see their own cars
CREATE POLICY "Customers see own cars"
  ON cars FOR SELECT
  USING (auth.uid() = owner_id);

-- Admins see all cars
CREATE POLICY "Admins see all cars"
  ON cars FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers see cars at their locations
CREATE POLICY "Managers see location cars"
  ON cars FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid()
        AND role = 'location_manager'
        AND location_id = cars.primary_location_id
        AND is_active = true
    )
  );

-- Customers can add their own cars
CREATE POLICY "Customers insert own cars"
  ON cars FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Customers can update their own cars
CREATE POLICY "Customers update own cars"
  ON cars FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Customers can delete (deactivate) their own cars
CREATE POLICY "Customers delete own cars"
  ON cars FOR DELETE
  USING (auth.uid() = owner_id);

-- ============ SERVICE CATALOG ============
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active services
CREATE POLICY "Authenticated users can view active services"
  ON service_catalog FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage services
CREATE POLICY "Admins can manage services"
  ON service_catalog FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ WASH PACKAGES ============
ALTER TABLE wash_packages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active packages
CREATE POLICY "Authenticated users can view active packages"
  ON wash_packages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage packages
CREATE POLICY "Admins can manage packages"
  ON wash_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ PACKAGE LOCATION PRICING ============
ALTER TABLE package_location_pricing ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pricing
CREATE POLICY "Authenticated users can view pricing"
  ON package_location_pricing FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage pricing
CREATE POLICY "Admins can manage pricing"
  ON package_location_pricing FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ PREMIUM FEES ============
ALTER TABLE premium_fees ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read fees
CREATE POLICY "Authenticated users can view fees"
  ON premium_fees FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage fees
CREATE POLICY "Admins can manage fees"
  ON premium_fees FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
