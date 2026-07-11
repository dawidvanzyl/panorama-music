-- Create invite_tokens table
-- Stores invite tokens for user registration.

CREATE TABLE IF NOT EXISTS identity.invite_tokens (
    token_id   UUID        NOT NULL PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES identity.users(user_id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ NULL
);
