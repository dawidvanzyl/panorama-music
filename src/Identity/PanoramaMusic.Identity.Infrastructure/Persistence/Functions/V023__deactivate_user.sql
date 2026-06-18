-- V023: deactivate_user
-- Sets is_active = FALSE for a user.

CREATE OR REPLACE FUNCTION identity.deactivate_user(
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.users
    SET is_active = FALSE
    WHERE user_id = p_user_id;
END;
$$;