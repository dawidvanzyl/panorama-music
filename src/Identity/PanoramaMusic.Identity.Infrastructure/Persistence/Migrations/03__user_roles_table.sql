-- Create user_roles table
-- Stores role assignments for identity users.

CREATE TABLE IF NOT EXISTS identity.user_roles (
    user_id UUID NOT NULL REFERENCES identity.users(user_id) ON DELETE CASCADE,
    role    TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
);
