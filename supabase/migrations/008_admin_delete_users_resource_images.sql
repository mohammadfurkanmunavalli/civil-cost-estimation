-- Add resource images and an admin-only user deletion RPC.

ALTER TABLE resources
ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-images', 'resource-images', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE POLICY "Authenticated users can view resource images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'resource-images');

CREATE POLICY "Admins can upload resource images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resource-images'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update resource images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resource-images'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'resource-images'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete resource images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resource-images'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account with this function.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users.';
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
