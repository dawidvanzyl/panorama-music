-- get_students
-- Returns the student roster. Filtering is a client-side concern over the
-- cached list, not a server-side responsibility.
-- A student holding a waiting-list entry is excluded (#292) — unless they also
-- hold a course enrollment, in which case enrollment wins: the milestone rule
-- is a student is on the waiting list or enrolled, never both and never
-- neither (see #272 Overview and ruling R3), so a student who somehow holds
-- both stays visible here rather than disappearing from both screens.

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
    WHERE NOT EXISTS (
        SELECT 1 FROM students.waiting_list wl WHERE wl.student_id = s.student_id
    ) OR EXISTS (
        SELECT 1 FROM students.student_courses sc WHERE sc.student_id = s.student_id
    )
    ORDER BY s.grade, s.class, s.last_name, s.first_name;
END;
$$;
