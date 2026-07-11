-- update_revoke_all_refresh_tokens_except
-- Revokes every active refresh token system-wide except the one given - used for the
-- admin "Revoke All (Global)" action, which must never revoke the admin's own
-- current session. Access-token denylisting for the affected sessions is a
-- separate write, coordinated with this one inside a transaction at the
-- repository level (see RefreshTokenRepository.RevokeAllExceptAsync).

DROP FUNCTION IF EXISTS identity.update_revoke_all_refresh_tokens_except(UUID);

CREATE OR REPLACE FUNCTION identity.update_revoke_all_refresh_tokens_except(
    p_except_token_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE token_id != p_except_token_id
      AND revoked_at IS NULL
      AND expires_at > NOW();
END;
$$;
