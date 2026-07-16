-- get_active_refresh_tokens_by_user
-- Returns every non-revoked, non-expired refresh token for a single user.

DROP FUNCTION IF EXISTS identity.get_active_refresh_tokens_by_user(UUID);

CREATE OR REPLACE FUNCTION identity.get_active_refresh_tokens_by_user(
    p_user_id UUID
)
RETURNS TABLE(
    token_id           UUID,
    user_id            UUID,
    token_hash         TEXT,
    expires_at         TIMESTAMPTZ,
    revoked_at         TIMESTAMPTZ,
    family_id          UUID,
    session_started_at TIMESTAMPTZ,
    device_label       TEXT,
    ip_address         TEXT,
    last_seen_at       TIMESTAMPTZ,
    access_token_jti   UUID,
    access_token_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT rt.token_id, rt.user_id, rt.token_hash, rt.expires_at, rt.revoked_at, rt.family_id, rt.session_started_at,
           rt.device_label, rt.ip_address, rt.last_seen_at, rt.access_token_jti, rt.access_token_expires_at
    FROM identity.refresh_tokens rt
    WHERE rt.user_id = p_user_id
      AND rt.revoked_at IS NULL
      AND rt.expires_at > NOW()
    ORDER BY rt.last_seen_at DESC;
END;
$$;
