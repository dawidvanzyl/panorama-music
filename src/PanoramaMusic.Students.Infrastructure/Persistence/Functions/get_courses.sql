-- get_courses
-- Joins each course to its lesson structure so the whole list, structure detail
-- included, is assembled in one query rather than one lookup per course.
-- Narrowing the catalogue is a client-side concern, as it is for students, so
-- the read takes no filters.

-- The filtered signature never shipped; drop it so the no-argument call cannot
-- resolve to a leftover overload in a database that already ran the old script.
DROP FUNCTION IF EXISTS students.get_courses(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION students.get_courses()
RETURNS TABLE(
    course_id           UUID,
    course_type         TEXT,
    cost                NUMERIC,
    lesson_structure_id UUID,
    lesson_type         TEXT,
    duration_type       TEXT,
    occurrence_type     TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.course_id, c.course_type, c.cost, c.lesson_structure_id,
           ls.lesson_type, ls.duration_type, ls.occurrence_type
    FROM students.courses c
    JOIN students.lesson_structures ls ON ls.lesson_structure_id = c.lesson_structure_id
    ORDER BY c.course_type, ls.lesson_type, ls.duration_type, ls.occurrence_type;
END;
$$;
