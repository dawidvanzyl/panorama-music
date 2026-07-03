-- update_revoke_all_refresh_tokens_except
-- Revokes every active refresh token system-wide except the one given, and denylists
-- each affected session's currently-issued (still-live) access token in the same
-- statement - used for the admin "Revoke All (Global)" action, which must never
-- revoke the admin's own current session. Running both effects inside one
-- function call keeps them atomic: either the whole revocation succeeds, or
-- neither the refresh tokens nor the access-token denylist entries change.

DROP FUNCTION IF EXISTS identity.update_revoke_all_refresh_tokens_except(UUID);

CREATE OR REPLACE FUNCTION identity.update_revoke_all_refresh_tokens_except(
    p_except_token_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.revoked_access_tokens (jti, expires_at)
    SELECT rt.access_token_jti, rt.access_token_expires_at
    FROM identity.refresh_tokens rt
    WHERE rt.token_id != p_except_token_id
      AND rt.revoked_at IS NULL
      AND rt.expires_at > NOW()
      AND rt.access_token_jti IS NOT NULL
      AND rt.access_token_expires_at > NOW()
    ON CONFLICT (jti) DO NOTHING;

    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE token_id != p_except_token_id
      AND revoked_at IS NULL
      AND expires_at > NOW();
END;
$$;
