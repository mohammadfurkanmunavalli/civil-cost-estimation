-- Restore the self-service account deletion RPC expected by Settings > Danger Zone.

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

  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = requester_id;

  DELETE FROM auth.users
  WHERE id = requester_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
