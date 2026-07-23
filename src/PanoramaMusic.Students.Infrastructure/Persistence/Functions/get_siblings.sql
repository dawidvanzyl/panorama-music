-- get_siblings
-- Returns the full student row for every student currently linked as a
-- sibling of p_student_id.

CREATE OR REPLACE FUNCTION students.get_siblings(
    p_student_id UUID
)
RETURNS TABLE(
    student_id     UUID,
    first_name     TEXT,
    last_name      TEXT,
    date_of_birth  DATE,
    grade          TEXT,
    class          TEXT,
    phase          TEXT,
    language       TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT st.student_id, st.first_name, st.last_name, st.date_of_birth, st.grade, st.class, st.phase, st.language
    FROM students.siblings sib
    JOIN students.students st ON st.student_id = sib.sibling_id
    WHERE sib.student_id = p_student_id;
END;
$$;
