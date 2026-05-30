-- Fix admin user deletion audit writes.
--
-- audit_logs.user_id is the actor FK, so it must reference a user that still
-- exists after the delete. The deleted account id is stored in metadata.

ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

UPDATE public.audit_logs
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = audit_logs.user_id
  );

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_user_id UUID := auth.uid();
  target_profile public.profiles%ROWTYPE;
BEGIN
  IF target_user_id = admin_user_id THEN
    RAISE EXCEPTION 'Admins cannot delete their own account with this function.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = admin_user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users.';
  END IF;

  SELECT *
  INTO target_profile
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_profile.id IS NULL THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  -- Existing audit rows for the deleted account should remain, but they cannot
  -- keep a hard FK to an auth user that is about to be removed.
  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = target_user_id;

  DELETE FROM auth.users
  WHERE id = target_user_id;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    admin_user_id,
    'DATA_DESTRUCTION',
    'auth.users',
    target_user_id,
    jsonb_build_object(
      'deleted_user_id', target_user_id,
      'deleted_user_email', target_profile.email,
      'deleted_user_name', target_profile.full_name,
      'deleted_user_role', target_profile.role
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
