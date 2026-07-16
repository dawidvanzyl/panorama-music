-- get_user_by_email
-- Returns a single user row by email address.

CREATE OR REPLACE FUNCTION identity.get_user_by_email(
    p_email TEXT
)
RETURNS TABLE(
    user_id                  UUID,
    email                    TEXT,
    password_hash            TEXT,
    is_active                BOOLEAN,
    created_at               TIMESTAMPTZ,
    requires_password_reset  BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.email, u.password_hash, u.is_active, u.created_at, u.requires_password_reset
    FROM identity.users u
    WHERE u.email = p_email;
END;
$$;
