-- delete_user
-- Permanently removes a user and all associated data from the database.

CREATE OR REPLACE FUNCTION identity.delete_user(
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM identity.refresh_tokens  WHERE user_id = p_user_id;
    DELETE FROM identity.invite_tokens   WHERE user_id = p_user_id;
    DELETE FROM identity.user_roles      WHERE user_id = p_user_id;
    DELETE FROM identity.users           WHERE user_id = p_user_id;
END;
$$;