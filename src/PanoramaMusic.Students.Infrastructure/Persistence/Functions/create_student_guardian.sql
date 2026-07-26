CREATE OR REPLACE FUNCTION students.create_student_guardian(
    p_student_id  UUID,
    p_guardian_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.student_guardians (student_id, guardian_id)
    VALUES (p_student_id, p_guardian_id)
    ON CONFLICT (student_id, guardian_id) DO NOTHING;
END;
$$;
