-- myWash: Admin role setup helper
-- Run this AFTER you sign up to make yourself admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';

-- Create a function admins can call to promote users
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET role = 'admin' WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to promote to washer
CREATE OR REPLACE FUNCTION promote_to_washer(user_email TEXT, rate DECIMAL DEFAULT 150.00)
RETURNS void AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM profiles WHERE email = user_email;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE profiles SET role = 'car_washer' WHERE id = uid;

  INSERT INTO washer_profiles (user_id, hourly_rate, hire_date)
  VALUES (uid, rate, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to promote to manager
CREATE OR REPLACE FUNCTION promote_to_manager(user_email TEXT, loc_id UUID)
RETURNS void AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM profiles WHERE email = user_email;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE profiles SET role = 'location_manager' WHERE id = uid;

  INSERT INTO location_staff (location_id, user_id, role, is_primary, is_active)
  VALUES (loc_id, uid, 'location_manager', true, true)
  ON CONFLICT (location_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
