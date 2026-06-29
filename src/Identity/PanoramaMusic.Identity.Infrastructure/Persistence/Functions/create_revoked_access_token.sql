-- create_revoked_access_token
-- Denylists an access token's jti. Opportunistically purges expired entries so the
-- table stays bounded to currently-live access tokens rather than growing unbounded.

CREATE OR REPLACE FUNCTION identity.create_revoked_access_token(
    p_jti        UUID,
    p_expires_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM identity.revoked_access_tokens WHERE expires_at < NOW();

    INSERT INTO identity.revoked_access_tokens (jti, expires_at)
    VALUES (p_jti, p_expires_at)
    ON CONFLICT (jti) DO NOTHING;
END;
$$;
