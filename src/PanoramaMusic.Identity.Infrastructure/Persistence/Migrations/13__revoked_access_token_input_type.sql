-- Composite type used as the single-array parameter (Postgres' table-valued-parameter
-- equivalent) for identity.create_revoked_access_tokens, replacing the two
-- parallel-array parameters that previously had to be kept in sync by caller/function
-- agreement on row order. See #164.

CREATE TYPE identity.revoked_access_token_input AS (
    jti UUID,
    expires_at TIMESTAMPTZ
);
