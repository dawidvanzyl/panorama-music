-- V020: use_password_reset_token
-- Sets used_at = NOW() on a single password reset token.

CREATE OR REPLACE FUNCTION identity.use_password_reset_token(
    p_token_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.password_reset_tokens
    SET used_at = NOW()
    WHERE token_id = p_token_id
      AND used_at IS NULL;
END;
$$;
