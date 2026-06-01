-- V005: get_roles_by_user_id
-- Returns all roles assigned to a user.

CREATE OR REPLACE FUNCTION identity.get_roles_by_user_id(
    p_user_id UUID
)
RETURNS TABLE(role TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT ur.role
    FROM identity.user_roles ur
    WHERE ur.user_id = p_user_id;
END;
$$;
