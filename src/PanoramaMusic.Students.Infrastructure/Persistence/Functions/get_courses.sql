-- get_courses
-- Joins each course to its lesson structure so the whole list, structure detail
-- included, is assembled in one query rather than one lookup per course.
-- Every filter is optional; a NULL leaves that dimension unfiltered, so passing
-- several narrows the result by all of them together.

CREATE OR REPLACE FUNCTION students.get_courses(
    p_course_type     TEXT DEFAULT NULL,
    p_lesson_type     TEXT DEFAULT NULL,
    p_duration_type   TEXT DEFAULT NULL,
    p_occurrence_type TEXT DEFAULT NULL
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
    WHERE (p_course_type IS NULL OR c.course_type = p_course_type)
      AND (p_lesson_type IS NULL OR ls.lesson_type = p_lesson_type)
      AND (p_duration_type IS NULL OR ls.duration_type = p_duration_type)
      AND (p_occurrence_type IS NULL OR ls.occurrence_type = p_occurrence_type)
    ORDER BY c.course_type, ls.lesson_type, ls.duration_type, ls.occurrence_type;
END;
$$;
