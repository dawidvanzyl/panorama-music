-- delete_student_instrument
-- Drops whatever instrument and step an enrollment recorded. Correcting them is
-- this delete followed by create_student_instrument on the same ambient
-- transaction, rather than one function doing both — a course type that records
-- neither leaves nothing behind that way. A no-op when the enrollment recorded
-- nothing to begin with.

CREATE OR REPLACE FUNCTION students.delete_student_instrument(
    p_student_course_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.student_instruments
    WHERE student_course_id = p_student_course_id;
END;
$$;
