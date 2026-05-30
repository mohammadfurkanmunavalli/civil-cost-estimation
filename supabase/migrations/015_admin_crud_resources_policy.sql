-- Migration 015: Allow Admins to CRUD all master resources in the library

DROP POLICY IF EXISTS "Admins can CRUD all resources" ON resources;

CREATE POLICY "Admins can CRUD all resources"
ON resources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

NOTIFY pgrst, 'reload schema';
