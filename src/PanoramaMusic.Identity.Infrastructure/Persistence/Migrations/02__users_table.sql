-- Create users table
-- Stores identity user records in the identity schema.

CREATE TABLE IF NOT EXISTS identity.users (
    user_id      UUID        NOT NULL PRIMARY KEY,
    email        TEXT        NOT NULL UNIQUE,
    password_hash TEXT       NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
