-- Add requires_password_reset column
-- Marks an account as needing a forced credential rotation before normal
-- access is granted (e.g. the seeded admin account).

ALTER TABLE identity.users
    ADD COLUMN IF NOT EXISTS requires_password_reset BOOLEAN NOT NULL DEFAULT FALSE;
