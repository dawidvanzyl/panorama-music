-- create_student
-- Inserts a new student into students.students. p_student bundles the
-- writable fields as the students.student_input composite type - Postgres'
-- equivalent of a table-valued parameter - instead of one scalar parameter
-- per column.

DROP FUNCTION IF EXISTS students.create_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION students.create_student(
    p_student_id UUID,
    p_student    students.student_input
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
    VALUES (
        p_student_id,
        (p_student).first_name,
        (p_student).last_name,
        (p_student).date_of_birth,
        (p_student).grade,
        (p_student).class,
        (p_student).phase,
        (p_student).language
    );
END;
$$;
