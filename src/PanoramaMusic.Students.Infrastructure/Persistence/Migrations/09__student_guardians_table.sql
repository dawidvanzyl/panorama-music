-- Create student_guardians table
-- Pure (student_id, guardian_id) link — a guardian is shared across a
-- sibling group through one row per linked student. ON DELETE CASCADE on
-- both columns: deleting a student removes their guardian links, and
-- deleting a guardian (full delete, not a scoped unlink) removes every
-- link to it in one statement.

CREATE TABLE IF NOT EXISTS students.student_guardians (
    student_id  UUID        NOT NULL REFERENCES students.students(student_id) ON DELETE CASCADE,
    guardian_id UUID        NOT NULL REFERENCES students.guardians(guardian_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, guardian_id)
);
