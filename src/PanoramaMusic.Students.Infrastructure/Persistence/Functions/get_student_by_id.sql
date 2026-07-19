-- get_student_by_id
-- Returns a single student row by id, or no rows if not found.

DROP FUNCTION IF EXISTS students.get_student_by_id(UUID);

CREATE OR REPLACE FUNCTION students.get_student_by_id(
    p_student_id UUID
)
RETURNS TABLE(
    student_id     UUID,
    first_name     TEXT,
    last_name      TEXT,
    date_of_birth  DATE,
    grade          TEXT,
    class          TEXT,
    phase          TEXT,
    language       TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT s.student_id, s.first_name, s.last_name, s.date_of_birth, s.grade, s.class, s.phase, s.language
    FROM students.students s
    WHERE s.student_id = p_student_id;
END;
$$;
