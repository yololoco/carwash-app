-- myWash: RLS for messages and upsell offers
-- Slice 7: Messaging + Upsells

-- ============ MESSAGES ============
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users mark messages read"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Admins see all messages"
  ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ UPSELL OFFERS ============
ALTER TABLE upsell_offers ENABLE ROW LEVEL SECURITY;

-- Washers create upsell offers
CREATE POLICY "Washers create upsell offers"
  ON upsell_offers FOR INSERT
  WITH CHECK (auth.uid() = washer_id);

-- Washers see their offers
CREATE POLICY "Washers see own offers"
  ON upsell_offers FOR SELECT
  USING (auth.uid() = washer_id);

-- Customers see offers for them
CREATE POLICY "Customers see own offers"
  ON upsell_offers FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can accept/decline
CREATE POLICY "Customers respond to offers"
  ON upsell_offers FOR UPDATE
  USING (auth.uid() = customer_id);

-- Admins see all
CREATE POLICY "Admins manage offers"
  ON upsell_offers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
