-- get_course_by_id
-- Reads one course with its lesson structure already joined, so a maintenance
-- use case loads the whole aggregate in a single round trip, the same way
-- get_courses does for the list.
CREATE OR REPLACE FUNCTION students.get_course_by_id(
    p_course_id UUID
)
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
    WHERE c.course_id = p_course_id;
END;
$$;
