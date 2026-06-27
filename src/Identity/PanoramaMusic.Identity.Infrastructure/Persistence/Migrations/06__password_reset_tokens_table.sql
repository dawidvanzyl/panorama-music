-- Create password_reset_tokens table
-- Stores single-use, time-limited tokens for self-service password reset.

CREATE TABLE IF NOT EXISTS identity.password_reset_tokens (
    token_id   UUID        NOT NULL PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES identity.users(user_id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ NULL
);
