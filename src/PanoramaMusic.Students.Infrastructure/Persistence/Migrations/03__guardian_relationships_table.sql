-- Create guardian_relationships table
-- Seeded lookup of guardian relationship types, referenced by Guardians (#6).

CREATE TABLE IF NOT EXISTS students.guardian_relationships (
    guardian_relationship_id UUID        NOT NULL PRIMARY KEY,
    name                     TEXT        NOT NULL UNIQUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
