-- get_users_by_role
-- Returns every user holding the given role. Identity owns which accounts hold
-- which role, so contexts that need that set ask for it here rather than
-- reading identity's tables themselves.

CREATE OR REPLACE FUNCTION identity.get_users_by_role(
    p_role TEXT
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
    INNER JOIN identity.user_roles r
        ON r.user_id = u.user_id
       AND r.role = p_role
    ORDER BY u.email;
END;
$$;
