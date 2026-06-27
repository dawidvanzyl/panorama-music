-- create_password_reset_token
-- Inserts a new password reset token for a user.

CREATE OR REPLACE FUNCTION identity.create_password_reset_token(
    p_token_id   UUID,
    p_user_id    UUID,
    p_token_hash TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.password_reset_tokens (token_id, user_id, token_hash, expires_at)
    VALUES (p_token_id, p_user_id, p_token_hash, p_expires_at);
END;
$$;
