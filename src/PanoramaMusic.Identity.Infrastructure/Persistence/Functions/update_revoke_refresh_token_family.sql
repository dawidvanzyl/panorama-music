-- update_revoke_refresh_token_family
-- Sets revoked_at = NOW() on every non-revoked refresh token descended from the same family,
-- used when a rotated (and therefore already-revoked) token is replayed.

CREATE OR REPLACE FUNCTION identity.update_revoke_refresh_token_family(
    p_family_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE identity.refresh_tokens
    SET revoked_at = NOW()
    WHERE family_id = p_family_id
      AND revoked_at IS NULL;
END;
$$;
