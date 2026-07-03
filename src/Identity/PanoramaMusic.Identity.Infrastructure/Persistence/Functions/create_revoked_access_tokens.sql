-- create_revoked_access_tokens
-- Bulk-denylists a set of access-token jti/expiry pairs in a single INSERT, used when
-- revoking many sessions at once (revoke-all-others, admin revoke-all-global) so the
-- denylist write is one round trip instead of one create_revoked_access_token call per
-- session. p_jtis and p_expires_ats are parallel arrays - Postgres' equivalent of a
-- table-valued parameter, unnested into rows here. See #164 for the tracked follow-up
-- to migrate this to a single composite-type array parameter instead. Expired-entry
-- cleanup is a separate write - see delete_expired_revoked_access_tokens, called
-- alongside this one at the repository level.

DROP FUNCTION IF EXISTS identity.create_revoked_access_tokens(UUID[], TIMESTAMPTZ[]);

CREATE OR REPLACE FUNCTION identity.create_revoked_access_tokens(
    p_jtis        UUID[],
    p_expires_ats TIMESTAMPTZ[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.revoked_access_tokens (jti, expires_at)
    SELECT * FROM unnest(p_jtis, p_expires_ats)
    ON CONFLICT (jti) DO NOTHING;
END;
$$;
