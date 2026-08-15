-- update_course_cost
-- Cost is the whole of a course's mutable state; the course type and the
-- lesson structure link are settled at creation and are not writable here.
CREATE OR REPLACE FUNCTION students.update_course_cost(
    p_course_id UUID,
    p_cost      NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.courses
    SET cost = p_cost
    WHERE course_id = p_course_id;
END;
$$;
