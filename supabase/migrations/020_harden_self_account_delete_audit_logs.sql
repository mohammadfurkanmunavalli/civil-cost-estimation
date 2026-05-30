-- Harden self-service account deletion against audit log FK races.
-- Some delete cascades/triggers can write audit rows while the auth user is
-- being removed. Deferring the FK lets the RPC null those references before
-- the transaction commits.

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
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requester_id UUID := auth.uid();
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to delete an account.';
  END IF;

  SET CONSTRAINTS audit_logs_user_id_fkey DEFERRED;

  DELETE FROM public.shared_projects
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = requester_id
  );

  DELETE FROM public.project_versions
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = requester_id
  );

  DELETE FROM public.financial_settings
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = requester_id
  );

  DELETE FROM public.risks
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = requester_id
  );

  DELETE FROM public.cost_items
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE user_id = requester_id
  );

  DELETE FROM public.project_collaborators
  WHERE user_id = requester_id
     OR invited_by = requester_id
     OR project_id IN (
       SELECT id FROM public.projects WHERE user_id = requester_id
     );

  DELETE FROM public.projects
  WHERE user_id = requester_id;

  DELETE FROM public.resources
  WHERE user_id = requester_id;

  DELETE FROM public.cost_databases
  WHERE user_id = requester_id;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.subscriptions WHERE user_id = $1'
    USING requester_id;
  END IF;

  DELETE FROM public.profiles
  WHERE id = requester_id;

  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = requester_id
     OR (
       user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM auth.users
         WHERE auth.users.id = audit_logs.user_id
       )
     );

  DELETE FROM auth.users
  WHERE id = requester_id;

  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = requester_id
     OR (
       user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM auth.users
         WHERE auth.users.id = audit_logs.user_id
       )
     );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
