-- delete_student_course
-- Withdraws a student from a course. The instrument and step recorded against
-- the enrollment go with it: student_instruments cascades on the enrollment (see
-- 13__student_instruments_table.sql), so this stays a single delete.

CREATE OR REPLACE FUNCTION students.delete_student_course(
    p_student_course_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.student_courses
    WHERE student_course_id = p_student_course_id;
END;
$$;
