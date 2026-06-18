-- V022: set_user_roles
-- Replaces all role assignments for a user with the provided set.

CREATE OR REPLACE FUNCTION identity.set_user_roles(
    p_user_id UUID,
    p_roles   TEXT[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM identity.user_roles WHERE user_id = p_user_id;
    INSERT INTO identity.user_roles (user_id, role)
    SELECT p_user_id, unnest(p_roles)
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;