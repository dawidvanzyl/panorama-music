-- V006: Create refresh_tokens table
-- Stores JWT refresh tokens for identity users.

CREATE TABLE IF NOT EXISTS identity.refresh_tokens (
    token_id   UUID        NOT NULL PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES identity.users(user_id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash
    ON identity.refresh_tokens(token_hash);
