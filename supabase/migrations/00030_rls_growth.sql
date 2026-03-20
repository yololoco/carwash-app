-- myWash: RLS for referrals, loyalty, corporate
-- Slice 12

-- Referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Admins manage referrals"
  ON referrals FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Loyalty points
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own points"
  ON loyalty_points FOR SELECT
  USING (auth.uid() = customer_id);
CREATE POLICY "Admins manage points"
  ON loyalty_points FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Loyalty transactions
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own transactions"
  ON loyalty_transactions FOR SELECT
  USING (auth.uid() = customer_id);
CREATE POLICY "Admins manage loyalty transactions"
  ON loyalty_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Corporate accounts
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage corporate"
  ON corporate_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Corporate members
ALTER TABLE corporate_account_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own membership"
  ON corporate_account_members FOR SELECT
  USING (auth.uid() = customer_id);
CREATE POLICY "Admins manage members"
  ON corporate_account_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
