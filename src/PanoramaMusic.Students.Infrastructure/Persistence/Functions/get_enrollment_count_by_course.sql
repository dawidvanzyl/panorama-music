-- get_enrollment_count_by_course
-- How many students are enrolled in a course. A course with any enrollment
-- against it cannot be deleted, so this is the condition that blocks the delete
-- — the same shape as get_guardian_count_by_relationship.

CREATE OR REPLACE FUNCTION students.get_enrollment_count_by_course(
    p_course_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    enrollment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO enrollment_count
    FROM students.student_courses
    WHERE course_id = p_course_id;

    RETURN enrollment_count;
END;
$$;
