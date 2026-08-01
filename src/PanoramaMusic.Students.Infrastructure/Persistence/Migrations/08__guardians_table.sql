-- Create guardians table
-- A guardian's relationship type lives here (not on the student_guardians
-- link — see 09__student_guardians_table.sql), referencing the seeded
-- guardian_relationships lookup (#4). Guardians have no user/login link.

CREATE TABLE IF NOT EXISTS students.guardians (
    guardian_id              UUID        NOT NULL PRIMARY KEY,
    guardian_relationship_id UUID        NOT NULL REFERENCES students.guardian_relationships(guardian_relationship_id),
    first_name               TEXT        NOT NULL,
    surname                  TEXT        NOT NULL,
    cell                     TEXT        NULL,
    email                    TEXT        NULL,
    receives_correspondence  BOOLEAN     NOT NULL DEFAULT FALSE,
    responsible_for_payment  BOOLEAN     NOT NULL DEFAULT FALSE,
    married                  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_guardians_guardian_relationship_id
    ON students.guardians (guardian_relationship_id);
