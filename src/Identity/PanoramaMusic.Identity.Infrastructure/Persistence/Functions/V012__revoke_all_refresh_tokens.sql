-- V012: revoke_all_refresh_tokens
-- Sets revoked_at = NOW() on all non-revoked refresh tokens for a user.

CREATE OR REPLACE FUNCTION identity.revoke_all_refresh_tokens(
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL;
END;
$$;
