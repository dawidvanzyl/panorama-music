-- V021: use_password_reset_token — add NOT FOUND guard
-- Raises an exception if the target token has already been used or does not exist,
-- making any future bypass a visible error rather than a silent commit.

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

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token already used or does not exist';
    END IF;
END;
$$;