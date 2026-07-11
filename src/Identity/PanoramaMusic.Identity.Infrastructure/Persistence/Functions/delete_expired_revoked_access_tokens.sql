-- delete_expired_revoked_access_tokens
-- Purges denylist entries whose access token has already expired naturally, keeping
-- identity.revoked_access_tokens bounded to currently-live tokens rather than growing
-- unbounded. Split out as its own function (rather than folded into every denylist
-- insert) so each function performs exactly one write operation.

CREATE OR REPLACE FUNCTION identity.delete_expired_revoked_access_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM identity.revoked_access_tokens WHERE expires_at < NOW();
END;
$$;
