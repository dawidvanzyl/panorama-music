-- get_course_by_type_and_structure
-- Reads the one course of a given type delivered under a given lesson
-- structure, with the structure already joined — the same shape and the same
-- single round trip get_course_by_id returns.
-- A course type and a lesson structure identify at most one course, so the
-- caller reads a row or nothing rather than choosing between candidates.
CREATE OR REPLACE FUNCTION students.get_course_by_type_and_structure(
    p_course_type       TEXT,
    p_lesson_structure_id UUID
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
    WHERE c.course_type = p_course_type
      AND c.lesson_structure_id = p_lesson_structure_id;
END;
$$;
