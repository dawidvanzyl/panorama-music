-- create_user_role
-- Inserts a role assignment for a user.

CREATE OR REPLACE FUNCTION identity.create_user_role(
    p_user_id UUID,
    p_role    TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
