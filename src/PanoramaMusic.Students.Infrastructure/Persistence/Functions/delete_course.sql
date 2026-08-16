-- delete_course
-- Removes only the course row. The lesson structure it referenced is seeded
-- reference data and is never touched by a course deletion.
CREATE OR REPLACE FUNCTION students.delete_course(
    p_course_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.courses
    WHERE course_id = p_course_id;
END;
$$;
