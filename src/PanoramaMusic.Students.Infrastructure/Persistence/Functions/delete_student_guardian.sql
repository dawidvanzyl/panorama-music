CREATE OR REPLACE FUNCTION students.delete_student_guardian(
    p_student_id  UUID,
    p_guardian_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.student_guardians
    WHERE student_id = p_student_id AND guardian_id = p_guardian_id;
END;
$$;
