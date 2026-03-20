-- myWash: Add clerk_id to profiles for Clerk integration

-- Drop the old auth.users trigger (Clerk handles auth now)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Add clerk_id column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- Drop the foreign key to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add unique on email for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON profiles(email);

-- Insert admin user
INSERT INTO profiles (id, email, full_name, role, clerk_id, referral_code)
VALUES (
  gen_random_uuid(),
  'jeroenciso@gmail.com',
  'Jeroen Ciso',
  'admin',
  'user_3BC1fGozM9IOVJlijv2uiK0Bwya',
  'JERO0001'
);
