-- Organize resource images into category-specific public buckets.
-- Existing image URLs in resource-images continue to work; new uploads use
-- the bucket matching the selected Resources tab.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('material-images', 'material-images', true),
  ('labor-images', 'labor-images', true),
  ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Authenticated users can view categorized resource images" ON storage.objects;
CREATE POLICY "Authenticated users can view categorized resource images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN (
    'material-images',
    'labor-images',
    'equipment-images'
  )
);

DROP POLICY IF EXISTS "Admins can upload categorized resource images" ON storage.objects;
CREATE POLICY "Admins can upload categorized resource images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN (
    'material-images',
    'labor-images',
    'equipment-images'
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update categorized resource images" ON storage.objects;
CREATE POLICY "Admins can update categorized resource images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    'material-images',
    'labor-images',
    'equipment-images'
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id IN (
    'material-images',
    'labor-images',
    'equipment-images'
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete categorized resource images" ON storage.objects;
CREATE POLICY "Admins can delete categorized resource images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    'material-images',
    'labor-images',
    'equipment-images'
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);
