-- create_refresh_token
-- Inserts a new refresh token for a user.

DROP FUNCTION IF EXISTS identity.create_refresh_token(UUID, UUID, TEXT, TIMESTAMPTZ, UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION identity.create_refresh_token(
    p_token_id           UUID,
    p_user_id            UUID,
    p_token_hash         TEXT,
    p_expires_at         TIMESTAMPTZ,
    p_family_id          UUID,
    p_session_started_at TIMESTAMPTZ,
    p_device_label       TEXT,
    p_ip_address         TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.refresh_tokens
        (token_id, user_id, token_hash, expires_at, family_id, session_started_at, device_label, ip_address, last_seen_at)
    VALUES
        (p_token_id, p_user_id, p_token_hash, p_expires_at, p_family_id, p_session_started_at, p_device_label, p_ip_address, NOW());
END;
$$;
