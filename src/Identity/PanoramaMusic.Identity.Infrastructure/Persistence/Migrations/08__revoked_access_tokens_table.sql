-- Create revoked_access_tokens table
-- Denylist of access-token jti values revoked on logout. Entries are scoped to the
-- access token's own (short) lifetime, not a general-purpose audit log — see
-- identity.create_revoked_access_token for cleanup of expired rows.

CREATE TABLE IF NOT EXISTS identity.revoked_access_tokens (
    jti        UUID        NOT NULL PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);
