-- update_user_password
-- Updates the password_hash for a user.

CREATE OR REPLACE FUNCTION identity.update_user_password(
    p_user_id      UUID,
    p_password_hash TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.users
    SET password_hash = p_password_hash,
        requires_password_reset = FALSE
    WHERE user_id = p_user_id;
END;
$$;
