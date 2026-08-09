-- get_users_by_ids
-- Returns the users matching the given ids, in one pass. Callers resolving a
-- set of accounts use this rather than a lookup per id, so no caller is pushed
-- into a query-per-row.

CREATE OR REPLACE FUNCTION identity.get_users_by_ids(
    p_user_ids UUID[]
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
    WHERE u.user_id = ANY(p_user_ids)
    ORDER BY u.email;
END;
$$;
