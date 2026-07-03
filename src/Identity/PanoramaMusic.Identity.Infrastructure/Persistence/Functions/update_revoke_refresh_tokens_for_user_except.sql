-- update_revoke_refresh_tokens_for_user_except
-- Revokes every active refresh token for a user except the one given, and denylists
-- each affected session's currently-issued (still-live) access token in the same
-- statement - used for "revoke all other sessions" from the personal Active Sessions
-- view. Running both effects inside one function call keeps them atomic.

DROP FUNCTION IF EXISTS identity.update_revoke_refresh_tokens_for_user_except(UUID, UUID);

CREATE OR REPLACE FUNCTION identity.update_revoke_refresh_tokens_for_user_except(
    p_user_id          UUID,
    p_except_token_id  UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.revoked_access_tokens (jti, expires_at)
    SELECT rt.access_token_jti, rt.access_token_expires_at
    FROM identity.refresh_tokens rt
    WHERE rt.user_id = p_user_id
      AND rt.token_id != p_except_token_id
      AND rt.revoked_at IS NULL
      AND rt.expires_at > NOW()
      AND rt.access_token_jti IS NOT NULL
      AND rt.access_token_expires_at > NOW()
    ON CONFLICT (jti) DO NOTHING;

    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
      AND token_id != p_except_token_id
      AND revoked_at IS NULL
      AND expires_at > NOW();
END;
$$;
