-- myWash: RLS for subscriptions and payments
-- Slice 2: Subscriptions + Payments

-- ============ SUBSCRIPTIONS ============
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins see all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers see location subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid()
        AND role = 'location_manager'
        AND location_id = subscriptions.location_id
        AND is_active = true
    )
  );

-- Customers can create subscriptions (for themselves)
CREATE POLICY "Customers create own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update own (pause, cancel, preferences)
CREATE POLICY "Customers update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = customer_id);

-- Admins can update any subscription
CREATE POLICY "Admins update any subscription"
  ON subscriptions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role (webhooks) handled via service_role key, bypasses RLS

-- ============ PAYMENTS ============
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own payments"
  ON payments FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins see all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers see location payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff ls
      JOIN subscriptions s ON s.id = payments.subscription_id
      WHERE ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.location_id = s.location_id
        AND ls.is_active = true
    )
  );

-- Only service_role (webhooks) and admins insert payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers can insert cash payments (marking as cash at checkout)
CREATE POLICY "Customers insert cash payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = customer_id AND payment_provider = 'cash');
