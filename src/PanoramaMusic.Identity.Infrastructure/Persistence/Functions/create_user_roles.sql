-- create_user_roles
-- Bulk-inserts role assignments for a user in a single INSERT, used so creating a user
-- with multiple roles is one round trip instead of one create_user_role call per role.
-- Same p_user_id + p_roles TEXT[] shape as identity.update_user_roles, minus its
-- DELETE - this function only ever adds roles, it never removes existing ones.

CREATE OR REPLACE FUNCTION identity.create_user_roles(
    p_user_id UUID,
    p_roles   TEXT[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.user_roles (user_id, role)
    SELECT p_user_id, unnest(p_roles)
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
