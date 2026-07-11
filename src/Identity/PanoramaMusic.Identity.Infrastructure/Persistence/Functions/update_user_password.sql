-- update_user_password
-- Updates the password_hash for a user.

CREATE OR REPLACE FUNCTION identity.update_user_password(
    p_user_id                          UUID,
    p_password_hash                    TEXT,
    p_clear_requires_password_reset    BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.users
    SET password_hash = p_password_hash,
        requires_password_reset = CASE
            WHEN p_clear_requires_password_reset THEN FALSE
            ELSE requires_password_reset
        END
    WHERE user_id = p_user_id;
END;
$$;
