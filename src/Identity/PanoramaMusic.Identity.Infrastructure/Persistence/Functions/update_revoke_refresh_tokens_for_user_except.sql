-- update_revoke_refresh_tokens_for_user_except
-- Revokes every active refresh token for a user except the one given - used for
-- "revoke all other sessions" from the personal Active Sessions view.

DROP FUNCTION IF EXISTS identity.update_revoke_refresh_tokens_for_user_except(UUID, UUID);

CREATE OR REPLACE FUNCTION identity.update_revoke_refresh_tokens_for_user_except(
    p_user_id          UUID,
    p_except_token_id  UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
      AND token_id != p_except_token_id
      AND revoked_at IS NULL;
END;
$$;
