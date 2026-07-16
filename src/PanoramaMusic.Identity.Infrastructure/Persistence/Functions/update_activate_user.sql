-- update_activate_user
-- Sets is_active = TRUE for a user.

CREATE OR REPLACE FUNCTION identity.update_activate_user(
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.users
    SET is_active = TRUE
    WHERE user_id = p_user_id;
END;
$$;
