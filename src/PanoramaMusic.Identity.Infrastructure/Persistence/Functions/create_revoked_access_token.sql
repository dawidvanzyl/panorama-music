-- create_revoked_access_token
-- Denylists a single access token's jti. Expired-entry cleanup is a separate write -
-- see delete_expired_revoked_access_tokens, called alongside this one at the
-- repository level.

CREATE OR REPLACE FUNCTION identity.create_revoked_access_token(
    p_jti        UUID,
    p_expires_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.revoked_access_tokens (jti, expires_at)
    VALUES (p_jti, p_expires_at)
    ON CONFLICT (jti) DO NOTHING;
END;
$$;
