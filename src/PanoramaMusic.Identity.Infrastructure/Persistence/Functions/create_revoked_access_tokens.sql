-- create_revoked_access_tokens
-- Bulk-denylists a set of access-token jti/expiry pairs in a single INSERT, used when
-- revoking many sessions at once (revoke-all-others, admin revoke-all-global) so the
-- denylist write is one round trip instead of one create_revoked_access_token call per
-- session. p_tokens is a single array of the identity.revoked_access_token_input
-- composite type - Postgres' equivalent of a table-valued parameter - unnested into
-- rows here. This replaces the former two-parallel-array signature (see #164), which
-- relied on caller and function agreeing on row order across two separate arguments.
-- Expired-entry cleanup is a separate write - see delete_expired_revoked_access_tokens,
-- called alongside this one at the repository level.

DROP FUNCTION IF EXISTS identity.create_revoked_access_tokens(UUID[], TIMESTAMPTZ[]);

CREATE OR REPLACE FUNCTION identity.create_revoked_access_tokens(
    p_tokens identity.revoked_access_token_input[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO identity.revoked_access_tokens (jti, expires_at)
    SELECT (t).jti, (t).expires_at FROM unnest(p_tokens) AS t
    ON CONFLICT (jti) DO NOTHING;
END;
$$;
