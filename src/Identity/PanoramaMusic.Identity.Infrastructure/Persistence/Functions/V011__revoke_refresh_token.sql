-- V011: revoke_refresh_token
-- Sets revoked_at = NOW() on a single refresh token.

CREATE OR REPLACE FUNCTION identity.revoke_refresh_token(
    p_token_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE token_id = p_token_id
      AND revoked_at IS NULL;
END;
$$;
