-- get_user_by_id
-- Returns a single user row by user_id.

CREATE OR REPLACE FUNCTION identity.get_user_by_id(
    p_user_id UUID
)
RETURNS TABLE(
    user_id       UUID,
    email         TEXT,
    password_hash TEXT,
    is_active     BOOLEAN,
    created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.email, u.password_hash, u.is_active, u.created_at
    FROM identity.users u
    WHERE u.user_id = p_user_id;
END;
$$;
