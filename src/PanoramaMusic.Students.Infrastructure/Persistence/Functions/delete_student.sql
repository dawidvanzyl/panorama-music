-- delete_student
-- Permanently removes a student from the database.

CREATE OR REPLACE FUNCTION students.delete_student(
    p_student_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.students WHERE student_id = p_student_id;
END;
$$;
