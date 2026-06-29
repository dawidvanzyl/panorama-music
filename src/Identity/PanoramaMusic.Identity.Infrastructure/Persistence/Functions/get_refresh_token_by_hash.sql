-- get_refresh_token_by_hash
-- Returns a single refresh token row by token_hash.

DROP FUNCTION IF EXISTS identity.get_refresh_token_by_hash(TEXT);

CREATE OR REPLACE FUNCTION identity.get_refresh_token_by_hash(
    p_token_hash TEXT
)
RETURNS TABLE(
    token_id           UUID,
    user_id            UUID,
    token_hash         TEXT,
    expires_at         TIMESTAMPTZ,
    revoked_at         TIMESTAMPTZ,
    family_id          UUID,
    session_started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT rt.token_id, rt.user_id, rt.token_hash, rt.expires_at, rt.revoked_at, rt.family_id, rt.session_started_at
    FROM identity.refresh_tokens rt
    WHERE rt.token_hash = p_token_hash;
END;
$$;
