-- V014: get_invite_token_by_hash
-- Returns a single invite token row by token_hash.

CREATE OR REPLACE FUNCTION identity.get_invite_token_by_hash(
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
    SELECT it.token_id, it.user_id, it.token_hash, it.expires_at, it.used_at
    FROM identity.invite_tokens it
    WHERE it.token_hash = p_token_hash;
END;
$$;
