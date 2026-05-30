-- ============================================================
-- RPC: ACCOUNT DELETION DESTROYER (Right to be Forgotten)
-- ============================================================
-- The frontend natively does not have permissions to delete records
-- from the core system `auth.users` schema. We inject a bypass 
-- routine that allows a user to authorize the obliteration of 
-- ONLY their own record. 
--
-- Because all other schema tables (Profiles, Projects, Cost Items)
-- map to `auth.users` via `ON DELETE CASCADE`, destroying the auth
-- record completely purges ALL the user's data autonomously.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
BEGIN
  -- Execute deletion against the active requester's ID
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
