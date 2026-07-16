-- create_user
-- Inserts a new user into identity.users.

CREATE OR REPLACE FUNCTION identity.create_user(
    p_user_id                  UUID,
    p_email                    TEXT,
    p_is_active                BOOLEAN,
    p_requires_password_reset  BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.users (user_id, email, is_active, requires_password_reset)
    VALUES (p_user_id, p_email, p_is_active, p_requires_password_reset);
END;
$$;
