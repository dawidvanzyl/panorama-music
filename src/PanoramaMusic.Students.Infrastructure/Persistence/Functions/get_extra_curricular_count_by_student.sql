-- get_extra_curricular_count_by_student
-- How many extra-curriculars a student takes part in. A student must hold at
-- least one course or one extra-curricular, so this is half of the condition
-- that blocks giving up their last holding — the same shape as
-- get_enrollment_count_by_student.

CREATE OR REPLACE FUNCTION students.get_extra_curricular_count_by_student(
    p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    extra_curricular_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO extra_curricular_count
    FROM students.student_extra_curriculars
    WHERE student_id = p_student_id;

    RETURN extra_curricular_count;
END;
$$;
