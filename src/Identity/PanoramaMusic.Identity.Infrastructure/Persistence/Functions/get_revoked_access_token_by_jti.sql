-- get_revoked_access_token_by_jti
-- Returns the matching row if the given jti is currently denylisted (and not yet expired).

CREATE OR REPLACE FUNCTION identity.get_revoked_access_token_by_jti(
    p_jti UUID
)
RETURNS TABLE(jti UUID)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT rat.jti
    FROM identity.revoked_access_tokens rat
    WHERE rat.jti = p_jti
      AND rat.expires_at > NOW();
END;
$$;
