-- get_users
-- Returns all user rows, ordered by creation date.

CREATE OR REPLACE FUNCTION identity.get_users()
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
    ORDER BY u.created_at;
END;
$$;
