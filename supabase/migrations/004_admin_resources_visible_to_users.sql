-- Allow all authenticated users to read resources created by admins.
-- This makes the admin resource library visible to normal users while keeping
-- resource writes limited to each resource owner/admin policies already present.

CREATE POLICY "Authenticated users can view admin resources"
ON resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = resources.user_id
      AND profiles.role = 'admin'
  )
);
