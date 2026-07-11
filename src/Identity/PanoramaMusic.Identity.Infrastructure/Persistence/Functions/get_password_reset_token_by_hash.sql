-- get_password_reset_token_by_hash
-- Returns a single password reset token row by token_hash.

CREATE OR REPLACE FUNCTION identity.get_password_reset_token_by_hash(
    p_token_hash TEXT
)
RETURNS TABLE(
    token_id   UUID,
    user_id    UUID,
    token_hash TEXT,
    expires_at TIMESTAMPTZ,
    used_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT prt.token_id, prt.user_id, prt.token_hash, prt.expires_at, prt.used_at
    FROM identity.password_reset_tokens prt
    WHERE prt.token_hash = p_token_hash;
END;
$$;
