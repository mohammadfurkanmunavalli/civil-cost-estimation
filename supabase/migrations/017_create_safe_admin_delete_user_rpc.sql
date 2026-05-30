-- Create a new admin delete RPC name to avoid stale cached definitions of
-- admin_delete_user in deployed Supabase projects.

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

CREATE OR REPLACE FUNCTION public.admin_delete_user_safe(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_user_id UUID := auth.uid();
BEGIN
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = target_user_id
  ) THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  -- Delete public data before removing auth.users. If any live database trigger
  -- writes an audit row during these deletes, the auth user still exists and the
  -- audit_logs FK can be satisfied. Audit references are nulled afterward.
  DELETE FROM public.shared_projects
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = target_user_id
  );

  DELETE FROM public.project_versions
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = target_user_id
  );

  DELETE FROM public.financial_settings
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = target_user_id
  );

  DELETE FROM public.risks
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = target_user_id
  );

  DELETE FROM public.cost_items
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = target_user_id
  );

  DELETE FROM public.project_collaborators
  WHERE user_id = target_user_id
     OR invited_by = target_user_id
     OR project_id IN (
       SELECT id FROM public.projects WHERE user_id = target_user_id
     );

  DELETE FROM public.projects
  WHERE user_id = target_user_id;

  DELETE FROM public.resources
  WHERE user_id = target_user_id;

  DELETE FROM public.cost_databases
  WHERE user_id = target_user_id;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.subscriptions WHERE user_id = $1'
    USING target_user_id;
  END IF;

  DELETE FROM public.profiles
  WHERE id = target_user_id;

  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = target_user_id
     OR NOT EXISTS (
       SELECT 1
       FROM auth.users
       WHERE auth.users.id = audit_logs.user_id
     );

  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_safe(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_safe(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
