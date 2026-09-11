-- get_siblings
-- Returns the full student row for every student currently linked as a
-- sibling of p_student_id, with the listing each of them belongs to. A sibling
-- group can span both listings — a family may have one child enrolled and
-- another still waiting — so each row's state is its own, read here rather than
-- inferred from the screen the group is being read on.

-- Dropped first because the returned columns changed: Postgres refuses to
-- replace a function whose result type differs.
DROP FUNCTION IF EXISTS students.get_siblings(UUID);

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
    language       TEXT,
    population     TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT st.student_id, st.first_name, st.last_name, st.date_of_birth, st.grade, st.class, st.phase, st.language,
           students.student_population(st.student_id) AS population
    FROM students.siblings sib
    JOIN students.students st ON st.student_id = sib.sibling_id
    WHERE sib.student_id = p_student_id;
END;
$$;
