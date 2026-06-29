-- create_refresh_token
-- Inserts a new refresh token for a user.

DROP FUNCTION IF EXISTS identity.create_refresh_token(UUID, UUID, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION identity.create_refresh_token(
    p_token_id           UUID,
    p_user_id            UUID,
    p_token_hash         TEXT,
    p_expires_at         TIMESTAMPTZ,
    p_family_id          UUID,
    p_session_started_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.refresh_tokens (token_id, user_id, token_hash, expires_at, family_id, session_started_at)
    VALUES (p_token_id, p_user_id, p_token_hash, p_expires_at, p_family_id, p_session_started_at);
END;
$$;
