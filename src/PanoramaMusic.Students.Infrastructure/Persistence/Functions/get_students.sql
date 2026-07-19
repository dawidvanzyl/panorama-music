-- get_students
-- Returns the full student roster. Filtering is a client-side concern over
-- the cached list, not a server-side responsibility.

DROP FUNCTION IF EXISTS students.get_students(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION students.get_students()
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
    ORDER BY s.grade, s.class, s.last_name, s.first_name;
END;
$$;
