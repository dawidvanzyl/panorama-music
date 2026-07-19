-- Composite type used as the single-parameter (Postgres' table-valued-parameter
-- equivalent) input for students.create_student and students.update_student,
-- bundling the student's writable fields into one argument instead of seven
-- parallel scalar parameters.

CREATE TYPE students.student_input AS (
    first_name    TEXT,
    last_name     TEXT,
    date_of_birth DATE,
    grade         TEXT,
    class         TEXT,
    phase         TEXT,
    language      TEXT
);
