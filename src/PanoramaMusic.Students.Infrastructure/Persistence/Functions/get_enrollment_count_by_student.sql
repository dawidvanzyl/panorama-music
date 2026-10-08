-- get_enrollment_count_by_student
-- How many courses a student is enrolled in. A student must hold at least one
-- course or one extra-curricular, so this is half of the condition that blocks
-- giving up their last holding — the same shape as get_enrollment_count_by_course.

CREATE OR REPLACE FUNCTION students.get_enrollment_count_by_student(
    p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    enrollment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO enrollment_count
    FROM students.student_courses
    WHERE student_id = p_student_id;

    RETURN enrollment_count;
END;
$$;
