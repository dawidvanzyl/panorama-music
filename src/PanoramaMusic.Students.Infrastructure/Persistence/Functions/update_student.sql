-- update_student
-- Updates an existing student's profile fields. p_student bundles the
-- writable fields as the students.student_input composite type - Postgres'
-- equivalent of a table-valued parameter - instead of one scalar parameter
-- per column.

DROP FUNCTION IF EXISTS students.update_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION students.update_student(
    p_student_id UUID,
    p_student    students.student_input
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.students
    SET first_name    = (p_student).first_name,
        last_name     = (p_student).last_name,
        date_of_birth = (p_student).date_of_birth,
        grade         = (p_student).grade,
        class         = (p_student).class,
        phase         = (p_student).phase,
        language      = (p_student).language
    WHERE student_id = p_student_id;
END;
$$;
