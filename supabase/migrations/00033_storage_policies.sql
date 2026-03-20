-- myWash: Storage bucket policies
-- Slice 14: Polish

-- ============ CAR-PHOTOS ============
-- Customers upload their own car photos
CREATE POLICY "Customers upload car photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'car-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Customers read their own car photos
CREATE POLICY "Customers read own car photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'car-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Washers can read car photos for assigned bookings
CREATE POLICY "Washers read assigned car photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'car-photos'
    AND EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.assigned_washer_id = auth.uid()
        AND c.owner_id::text = (storage.foldername(name))[1]
    )
  );

-- Admins read all car photos
CREATE POLICY "Admins read all car photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'car-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ EVIDENCE-PHOTOS ============
-- Washers upload evidence photos to their session folder
CREATE POLICY "Washers upload evidence photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence-photos'
    AND EXISTS (
      SELECT 1 FROM wash_sessions
      WHERE id::text = (storage.foldername(name))[1]
        AND washer_id = auth.uid()
    )
  );

-- Washers read their session evidence
CREATE POLICY "Washers read own evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence-photos'
    AND EXISTS (
      SELECT 1 FROM wash_sessions
      WHERE id::text = (storage.foldername(name))[1]
        AND washer_id = auth.uid()
    )
  );

-- Customers read evidence for their bookings
CREATE POLICY "Customers read booking evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence-photos'
    AND EXISTS (
      SELECT 1 FROM wash_sessions ws
      JOIN bookings b ON b.id = ws.booking_id
      WHERE ws.id::text = (storage.foldername(name))[1]
        AND b.customer_id = auth.uid()
    )
  );

-- Admins/managers read all evidence
CREATE POLICY "Admins read all evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ AVATARS ============
-- Users upload their own avatar
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users update their own avatar
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read for avatars (bucket is public)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
