-- myWash: Update RLS policies to work with Clerk auth
-- Clerk JWT 'sub' claim = Clerk user ID, available via auth.jwt()->>'sub'
-- Profiles now use clerk_id column to map to Clerk users
-- auth.uid() with Clerk third-party auth returns the sub claim as UUID
-- But our clerk_id is TEXT, so we use auth.jwt()->>'sub' = clerk_id

-- Helper function: get the current Clerk user's profile id
CREATE OR REPLACE FUNCTION get_my_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE clerk_id = (auth.jwt()->>'sub')::TEXT LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============ PROFILES ============
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with clerk_id
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((auth.jwt()->>'sub')::TEXT = clerk_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((auth.jwt()->>'sub')::TEXT = clerk_id)
  WITH CHECK ((auth.jwt()->>'sub')::TEXT = clerk_id);

-- ============ CARS ============
DROP POLICY IF EXISTS "Customers see own cars" ON cars;
DROP POLICY IF EXISTS "Customers insert own cars" ON cars;
DROP POLICY IF EXISTS "Customers update own cars" ON cars;
DROP POLICY IF EXISTS "Customers delete own cars" ON cars;

CREATE POLICY "Customers see own cars"
  ON cars FOR SELECT
  USING (owner_id = get_my_profile_id());

CREATE POLICY "Customers insert own cars"
  ON cars FOR INSERT
  WITH CHECK (owner_id = get_my_profile_id());

CREATE POLICY "Customers update own cars"
  ON cars FOR UPDATE
  USING (owner_id = get_my_profile_id())
  WITH CHECK (owner_id = get_my_profile_id());

CREATE POLICY "Customers delete own cars"
  ON cars FOR DELETE
  USING (owner_id = get_my_profile_id());

-- ============ BOOKINGS ============
DROP POLICY IF EXISTS "Customers see own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers create own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers update own bookings" ON bookings;
DROP POLICY IF EXISTS "Washers see assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Washers update assigned bookings" ON bookings;

CREATE POLICY "Customers see own bookings"
  ON bookings FOR SELECT
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Customers create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (customer_id = get_my_profile_id());

CREATE POLICY "Customers update own bookings"
  ON bookings FOR UPDATE
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Washers see assigned bookings"
  ON bookings FOR SELECT
  USING (assigned_washer_id = get_my_profile_id());

CREATE POLICY "Washers update assigned bookings"
  ON bookings FOR UPDATE
  USING (assigned_washer_id = get_my_profile_id());

-- ============ SUBSCRIPTIONS ============
DROP POLICY IF EXISTS "Customers see own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Customers create own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Customers update own subscriptions" ON subscriptions;

CREATE POLICY "Customers see own subscriptions"
  ON subscriptions FOR SELECT
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Customers create own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (customer_id = get_my_profile_id());

CREATE POLICY "Customers update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (customer_id = get_my_profile_id());

-- ============ PAYMENTS ============
DROP POLICY IF EXISTS "Customers see own payments" ON payments;
DROP POLICY IF EXISTS "Customers insert cash payments" ON payments;

CREATE POLICY "Customers see own payments"
  ON payments FOR SELECT
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Customers insert cash payments"
  ON payments FOR INSERT
  WITH CHECK (customer_id = get_my_profile_id() AND payment_provider = 'cash');

-- ============ WASH SESSIONS ============
DROP POLICY IF EXISTS "Washers see own sessions" ON wash_sessions;
DROP POLICY IF EXISTS "Washers create sessions" ON wash_sessions;
DROP POLICY IF EXISTS "Washers update own sessions" ON wash_sessions;
DROP POLICY IF EXISTS "Customers see own booking sessions" ON wash_sessions;

CREATE POLICY "Washers see own sessions"
  ON wash_sessions FOR SELECT
  USING (washer_id = get_my_profile_id());

CREATE POLICY "Washers create sessions"
  ON wash_sessions FOR INSERT
  WITH CHECK (washer_id = get_my_profile_id());

CREATE POLICY "Washers update own sessions"
  ON wash_sessions FOR UPDATE
  USING (washer_id = get_my_profile_id());

CREATE POLICY "Customers see own booking sessions"
  ON wash_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = wash_sessions.booking_id
        AND bookings.customer_id = get_my_profile_id()
    )
  );

-- ============ MESSAGES ============
DROP POLICY IF EXISTS "Users see own messages" ON messages;
DROP POLICY IF EXISTS "Users send messages" ON messages;
DROP POLICY IF EXISTS "Users mark messages read" ON messages;

CREATE POLICY "Users see own messages"
  ON messages FOR SELECT
  USING (sender_id = get_my_profile_id() OR receiver_id = get_my_profile_id());

CREATE POLICY "Users send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = get_my_profile_id());

CREATE POLICY "Users mark messages read"
  ON messages FOR UPDATE
  USING (receiver_id = get_my_profile_id());

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = get_my_profile_id());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = get_my_profile_id());

-- ============ QUALITY SURVEYS ============
DROP POLICY IF EXISTS "Customers insert own surveys" ON quality_surveys;
DROP POLICY IF EXISTS "Customers read own surveys" ON quality_surveys;
DROP POLICY IF EXISTS "Washers read own surveys" ON quality_surveys;

CREATE POLICY "Customers insert own surveys"
  ON quality_surveys FOR INSERT
  WITH CHECK (customer_id = get_my_profile_id());

CREATE POLICY "Customers read own surveys"
  ON quality_surveys FOR SELECT
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Washers read own surveys"
  ON quality_surveys FOR SELECT
  USING (washer_id = get_my_profile_id());

-- ============ DISPUTES ============
DROP POLICY IF EXISTS "Customers create own disputes" ON disputes;
DROP POLICY IF EXISTS "Customers read own disputes" ON disputes;

CREATE POLICY "Customers create own disputes"
  ON disputes FOR INSERT
  WITH CHECK (customer_id = get_my_profile_id());

CREATE POLICY "Customers read own disputes"
  ON disputes FOR SELECT
  USING (customer_id = get_my_profile_id());

-- ============ CUSTOM WASH TEMPLATES ============
DROP POLICY IF EXISTS "Customers manage own templates" ON custom_wash_templates;

CREATE POLICY "Customers manage own templates"
  ON custom_wash_templates FOR ALL
  USING (customer_id = get_my_profile_id())
  WITH CHECK (customer_id = get_my_profile_id());

-- ============ WAITLIST ============
DROP POLICY IF EXISTS "Customers see own waitlist" ON waitlist;

-- Recreate with correct function name pattern
CREATE POLICY "Customers manage own waitlist"
  ON waitlist FOR ALL
  USING (customer_id = get_my_profile_id())
  WITH CHECK (customer_id = get_my_profile_id());

-- ============ WASHER PROFILES ============
DROP POLICY IF EXISTS "Washers see own profile" ON washer_profiles;
DROP POLICY IF EXISTS "Washers update own profile" ON washer_profiles;

CREATE POLICY "Washers see own profile"
  ON washer_profiles FOR SELECT
  USING (user_id = get_my_profile_id());

CREATE POLICY "Washers update own profile"
  ON washer_profiles FOR UPDATE
  USING (user_id = get_my_profile_id());

-- ============ WASHER AVAILABILITY ============
DROP POLICY IF EXISTS "Washers manage own availability" ON washer_availability;

CREATE POLICY "Washers manage own availability"
  ON washer_availability FOR ALL
  USING (washer_id = get_my_profile_id())
  WITH CHECK (washer_id = get_my_profile_id());

-- ============ LOCATION STAFF ============
DROP POLICY IF EXISTS "Staff can view own assignments" ON location_staff;

CREATE POLICY "Staff can view own assignments"
  ON location_staff FOR SELECT
  USING (user_id = get_my_profile_id());

-- ============ UPSELL OFFERS ============
DROP POLICY IF EXISTS "Washers create upsell offers" ON upsell_offers;
DROP POLICY IF EXISTS "Washers see own offers" ON upsell_offers;
DROP POLICY IF EXISTS "Customers see own offers" ON upsell_offers;
DROP POLICY IF EXISTS "Customers respond to offers" ON upsell_offers;

CREATE POLICY "Washers create upsell offers"
  ON upsell_offers FOR INSERT
  WITH CHECK (washer_id = get_my_profile_id());

CREATE POLICY "Washers see own offers"
  ON upsell_offers FOR SELECT
  USING (washer_id = get_my_profile_id());

CREATE POLICY "Customers see own offers"
  ON upsell_offers FOR SELECT
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Customers respond to offers"
  ON upsell_offers FOR UPDATE
  USING (customer_id = get_my_profile_id());

-- ============ REFERRALS ============
DROP POLICY IF EXISTS "Users see own referrals" ON referrals;

CREATE POLICY "Users see own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = get_my_profile_id() OR referred_id = get_my_profile_id());

-- ============ LOYALTY ============
DROP POLICY IF EXISTS "Customers read own points" ON loyalty_points;
DROP POLICY IF EXISTS "Customers read own transactions" ON loyalty_transactions;

CREATE POLICY "Customers read own points"
  ON loyalty_points FOR SELECT
  USING (customer_id = get_my_profile_id());

CREATE POLICY "Customers read own transactions"
  ON loyalty_transactions FOR SELECT
  USING (customer_id = get_my_profile_id());

-- ============ DAILY OFFER RESPONSES ============
DROP POLICY IF EXISTS "Customers manage own responses" ON daily_offer_responses;

CREATE POLICY "Customers manage own responses"
  ON daily_offer_responses FOR ALL
  USING (customer_id = get_my_profile_id())
  WITH CHECK (customer_id = get_my_profile_id());

-- ============ CORPORATE MEMBERS ============
DROP POLICY IF EXISTS "Members read own membership" ON corporate_account_members;

CREATE POLICY "Members read own membership"
  ON corporate_account_members FOR SELECT
  USING (customer_id = get_my_profile_id());

-- ============ ADMIN POLICIES ============
-- Admin policies check profiles.role via the helper function
-- These need updating too since they reference auth.uid()

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE clerk_id = (auth.jwt()->>'sub')::TEXT
    AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if current user is manager at a location
CREATE OR REPLACE FUNCTION is_manager_at(loc_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM location_staff ls
    JOIN profiles p ON p.id = ls.user_id
    WHERE p.clerk_id = (auth.jwt()->>'sub')::TEXT
    AND ls.location_id = loc_id
    AND ls.role = 'location_manager'
    AND ls.is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update key admin policies that use auth.uid() subqueries
-- (The existing admin policies reference profiles WHERE id = auth.uid() which won't work)

-- Profiles admin
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (is_admin());

-- Locations admin
DROP POLICY IF EXISTS "Admins can view all locations" ON locations;
DROP POLICY IF EXISTS "Admins can create locations" ON locations;
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
CREATE POLICY "Admins can view all locations" ON locations FOR SELECT USING (is_admin());
CREATE POLICY "Admins can create locations" ON locations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update locations" ON locations FOR UPDATE USING (is_admin());

-- Bookings admin
DROP POLICY IF EXISTS "Admins see all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;
CREATE POLICY "Admins see all bookings" ON bookings FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage bookings" ON bookings FOR ALL USING (is_admin());

-- Subscriptions admin
DROP POLICY IF EXISTS "Admins see all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins update any subscription" ON subscriptions;
CREATE POLICY "Admins see all subscriptions" ON subscriptions FOR SELECT USING (is_admin());
CREATE POLICY "Admins update any subscription" ON subscriptions FOR UPDATE USING (is_admin());

-- Payments admin
DROP POLICY IF EXISTS "Admins see all payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins see all payments" ON payments FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage payments" ON payments FOR ALL USING (is_admin());

-- Services admin
DROP POLICY IF EXISTS "Admins can manage services" ON service_catalog;
CREATE POLICY "Admins can manage services" ON service_catalog FOR ALL USING (is_admin());

-- Packages admin
DROP POLICY IF EXISTS "Admins can manage packages" ON wash_packages;
CREATE POLICY "Admins can manage packages" ON wash_packages FOR ALL USING (is_admin());

-- Pricing admin
DROP POLICY IF EXISTS "Admins can manage pricing" ON package_location_pricing;
CREATE POLICY "Admins can manage pricing" ON package_location_pricing FOR ALL USING (is_admin());

-- Fees admin
DROP POLICY IF EXISTS "Admins can manage fees" ON premium_fees;
CREATE POLICY "Admins can manage fees" ON premium_fees FOR ALL USING (is_admin());

-- Wash sessions admin
DROP POLICY IF EXISTS "Admins see all sessions" ON wash_sessions;
CREATE POLICY "Admins see all sessions" ON wash_sessions FOR ALL USING (is_admin());

-- Evidence admin
DROP POLICY IF EXISTS "Admins see all photos" ON evidence_photos;
CREATE POLICY "Admins see all photos" ON evidence_photos FOR ALL USING (is_admin());

-- Damage admin
DROP POLICY IF EXISTS "Admins manage damage reports" ON damage_reports;
CREATE POLICY "Admins manage damage reports" ON damage_reports FOR ALL USING (is_admin());

-- Notifications admin
DROP POLICY IF EXISTS "Admins manage notifications" ON notifications;
CREATE POLICY "Admins manage notifications" ON notifications FOR ALL USING (is_admin());

-- Quality admin
DROP POLICY IF EXISTS "Admins read all surveys" ON quality_surveys;
CREATE POLICY "Admins read all surveys" ON quality_surveys FOR SELECT USING (is_admin());

-- Disputes admin
DROP POLICY IF EXISTS "Admins manage disputes" ON disputes;
CREATE POLICY "Admins manage disputes" ON disputes FOR ALL USING (is_admin());

-- Messages admin
DROP POLICY IF EXISTS "Admins see all messages" ON messages;
CREATE POLICY "Admins see all messages" ON messages FOR SELECT USING (is_admin());

-- Upsell admin
DROP POLICY IF EXISTS "Admins manage offers" ON upsell_offers;
CREATE POLICY "Admins manage offers" ON upsell_offers FOR ALL USING (is_admin());

-- Inventory admin
DROP POLICY IF EXISTS "Admins manage inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Admins see all stock" ON inventory_stock;
DROP POLICY IF EXISTS "Admins manage transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Admins manage material requirements" ON service_material_requirements;
DROP POLICY IF EXISTS "Admins see all costs" ON cost_records;
CREATE POLICY "Admins manage inventory items" ON inventory_items FOR ALL USING (is_admin());
CREATE POLICY "Admins see all stock" ON inventory_stock FOR SELECT USING (is_admin());
CREATE POLICY "Admins manage transactions" ON inventory_transactions FOR ALL USING (is_admin());
CREATE POLICY "Admins manage material requirements" ON service_material_requirements FOR ALL USING (is_admin());
CREATE POLICY "Admins see all costs" ON cost_records FOR ALL USING (is_admin());

-- Location staff admin
DROP POLICY IF EXISTS "Admins can manage all staff" ON location_staff;
CREATE POLICY "Admins can manage all staff" ON location_staff FOR ALL USING (is_admin());

-- Operating hours admin
DROP POLICY IF EXISTS "Admins can manage operating hours" ON location_operating_hours;
CREATE POLICY "Admins can manage operating hours" ON location_operating_hours FOR ALL USING (is_admin());

-- Special hours admin
DROP POLICY IF EXISTS "Admins can manage special hours" ON location_special_hours;
CREATE POLICY "Admins can manage special hours" ON location_special_hours FOR ALL USING (is_admin());

-- App settings admin
DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
CREATE POLICY "Admins can manage settings" ON app_settings FOR ALL USING (is_admin());

-- Washer profiles admin
DROP POLICY IF EXISTS "Admins manage washer profiles" ON washer_profiles;
CREATE POLICY "Admins manage washer profiles" ON washer_profiles FOR ALL USING (is_admin());

-- Referrals admin
DROP POLICY IF EXISTS "Admins manage referrals" ON referrals;
CREATE POLICY "Admins manage referrals" ON referrals FOR ALL USING (is_admin());

-- Loyalty admin
DROP POLICY IF EXISTS "Admins manage points" ON loyalty_points;
DROP POLICY IF EXISTS "Admins manage loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Admins manage points" ON loyalty_points FOR ALL USING (is_admin());
CREATE POLICY "Admins manage loyalty transactions" ON loyalty_transactions FOR ALL USING (is_admin());

-- Corporate admin
DROP POLICY IF EXISTS "Admins manage corporate" ON corporate_accounts;
DROP POLICY IF EXISTS "Admins manage members" ON corporate_account_members;
CREATE POLICY "Admins manage corporate" ON corporate_accounts FOR ALL USING (is_admin());
CREATE POLICY "Admins manage members" ON corporate_account_members FOR ALL USING (is_admin());

-- Daily offers admin
DROP POLICY IF EXISTS "Admins manage offers" ON daily_offers;
DROP POLICY IF EXISTS "Admins see all responses" ON daily_offer_responses;
CREATE POLICY "Admins manage offers" ON daily_offers FOR ALL USING (is_admin());
CREATE POLICY "Admins see all responses" ON daily_offer_responses FOR SELECT USING (is_admin());

-- Audit admin
DROP POLICY IF EXISTS "Admins read audit log" ON audit_log;
DROP POLICY IF EXISTS "Admins insert audit log" ON audit_log;
CREATE POLICY "Admins read audit log" ON audit_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert audit log" ON audit_log FOR INSERT WITH CHECK (is_admin());

-- Washer availability admin
DROP POLICY IF EXISTS "Admins manage availability" ON washer_availability;
CREATE POLICY "Admins manage availability" ON washer_availability FOR ALL USING (is_admin());
