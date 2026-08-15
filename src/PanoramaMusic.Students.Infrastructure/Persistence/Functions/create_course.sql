CREATE OR REPLACE FUNCTION students.create_course(
    p_course_id           UUID,
    p_course_type         TEXT,
    p_cost                NUMERIC,
    p_lesson_structure_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.courses (course_id, course_type, cost, lesson_structure_id)
    VALUES (p_course_id, p_course_type, p_cost, p_lesson_structure_id);
END;
$$;
