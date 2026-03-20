-- myWash: RLS for notifications
-- Slice 5: Notifications System

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see own notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own as read
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins manage notifications"
  ON notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- System inserts via service_role key (bypasses RLS)
