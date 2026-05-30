-- Remove the old subscription concept from existing Supabase projects.

DROP TABLE IF EXISTS subscriptions CASCADE;

ALTER TABLE profiles
DROP COLUMN IF EXISTS subscription_tier;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
