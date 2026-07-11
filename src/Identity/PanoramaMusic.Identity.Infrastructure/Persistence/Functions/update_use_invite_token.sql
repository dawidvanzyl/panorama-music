-- update_use_invite_token
-- Sets used_at = NOW() on a single invite token.

CREATE OR REPLACE FUNCTION identity.update_use_invite_token(
    p_token_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.invite_tokens
    SET used_at = NOW()
    WHERE token_id = p_token_id
      AND used_at IS NULL;
END;
$$;
