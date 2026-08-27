-- get_student_count_by_extra_curricular
-- How many students take part in an activity. An activity with any assignment
-- against it cannot be deleted, so this is the condition that blocks the delete
-- — the same shape as get_enrollment_count_by_course.

CREATE OR REPLACE FUNCTION students.get_student_count_by_extra_curricular(
    p_extra_curricular_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    assigned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO assigned_count
    FROM students.student_extra_curriculars
    WHERE extra_curricular_id = p_extra_curricular_id;

    RETURN assigned_count;
END;
$$;
