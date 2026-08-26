-- delete_student_extra_curricular
-- Removes one of a student's assignments. Only the link goes: neither the
-- student nor the activity is affected, and the student's other assignments are
-- untouched.

CREATE OR REPLACE FUNCTION students.delete_student_extra_curricular(
    p_student_id          UUID,
    p_extra_curricular_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.student_extra_curriculars
    WHERE student_id = p_student_id
      AND extra_curricular_id = p_extra_curricular_id;
END;
$$;
