-- V010: get_refresh_token_by_hash
-- Returns a single refresh token row by token_hash.

CREATE OR REPLACE FUNCTION identity.get_refresh_token_by_hash(
    p_token_hash TEXT
)
RETURNS TABLE(
    token_id   UUID,
    user_id    UUID,
    token_hash TEXT,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT rt.token_id, rt.user_id, rt.token_hash, rt.expires_at, rt.revoked_at
    FROM identity.refresh_tokens rt
    WHERE rt.token_hash = p_token_hash;
END;
$$;
