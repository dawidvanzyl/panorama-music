-- update_revoke_invite_tokens_for_user
-- Sets used_at = NOW() on all unused invite tokens for a user.

CREATE OR REPLACE FUNCTION identity.update_revoke_invite_tokens_for_user(
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.invite_tokens
    SET used_at = NOW()
    WHERE user_id = p_user_id
      AND used_at IS NULL;
END;
$$;
