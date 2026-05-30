-- Migration 013: Fix admin role update + audit log FK issue
-- 
-- Problem 1: Admins cannot update other users' profile roles due to RLS.
-- Problem 2: audit_logs INSERT fails when user is not yet in auth.users.
-- Problem 3: admin_delete_user needs to also delete profiles to cascade properly.

-- ============================================================
-- FIX 1: Allow admins to update any profile (role management)
-- ============================================================

-- Drop the existing update-own policy to add new one safely
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles self
    WHERE self.id = auth.uid()
      AND self.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles self
    WHERE self.id = auth.uid()
      AND self.role = 'admin'
  )
);

-- ============================================================
-- FIX 2: Create a SECURITY DEFINER RPC for role updates
-- This bypasses RLS entirely — much more reliable for admin ops.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update user roles.';
  END IF;

  -- Prevent demoting yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role.';
  END IF;

  -- Validate role value
  IF new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or user.';
  END IF;

  UPDATE profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;

-- ============================================================
-- FIX 3: Harden audit_logs FK to use ON DELETE SET NULL
-- so that deleting a user never blocks on audit log constraints.
-- This is idempotent — safe to run even if already applied.
-- ============================================================

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- ============================================================
-- FIX 4: Repair existing orphaned audit_log rows (if any)
-- ============================================================

UPDATE public.audit_logs
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE auth.users.id = audit_logs.user_id
  );

-- ============================================================
-- FIX 5: Rewrite admin_delete_user to NULL audit logs first
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account with this function.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users.';
  END IF;

  -- Null out audit log references so FK constraint doesn't block deletion
  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- Delete the user — this cascades to profiles, projects, etc.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

NOTIFY pgrst, 'reload schema';
