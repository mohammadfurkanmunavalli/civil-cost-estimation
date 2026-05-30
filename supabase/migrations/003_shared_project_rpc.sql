-- Public read-only payload for project share links.
-- Run this in Supabase so /share/:token can load project data through RLS safely.

CREATE OR REPLACE FUNCTION public.get_shared_project(
  input_token TEXT,
  input_password_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  share_record shared_projects%ROWTYPE;
  project_record projects%ROWTYPE;
BEGIN
  SELECT *
  INTO share_record
  FROM shared_projects
  WHERE share_token = input_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF share_record.expires_at IS NOT NULL AND share_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF share_record.password_hash IS NOT NULL
     AND share_record.password_hash <> COALESCE(input_password_hash, '') THEN
    RETURN jsonb_build_object(
      'status', 'password_required',
      'password_required', TRUE
    );
  END IF;

  SELECT *
  INTO project_record
  FROM projects
  WHERE id = share_record.project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  UPDATE shared_projects
  SET access_count = access_count + 1
  WHERE id = share_record.id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'password_required', share_record.password_hash IS NOT NULL,
    'project', to_jsonb(project_record),
    'cost_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(ci) ORDER BY ci.created_at)
      FROM cost_items ci
      WHERE ci.project_id = share_record.project_id
    ), '[]'::jsonb),
    'risks', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at)
      FROM risks r
      WHERE r.project_id = share_record.project_id
    ), '[]'::jsonb),
    'financial_settings', (
      SELECT to_jsonb(fs)
      FROM financial_settings fs
      WHERE fs.project_id = share_record.project_id
      LIMIT 1
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_project(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_project(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_project(TEXT, TEXT) TO authenticated;
