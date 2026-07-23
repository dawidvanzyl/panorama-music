-- Create siblings table
-- Self-referential association between two students. Bidirectional: linking
-- A and B as siblings inserts both (A, B) and (B, A) so a lookup by
-- student_id never needs a UNION/OR clause. ON DELETE CASCADE on both
-- columns removes a student's sibling links (both directions) when either
-- referenced student is deleted.

CREATE TABLE IF NOT EXISTS students.siblings (
    student_id UUID        NOT NULL REFERENCES students.students(student_id) ON DELETE CASCADE,
    sibling_id UUID        NOT NULL REFERENCES students.students(student_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, sibling_id),
    CHECK (student_id <> sibling_id)
);
