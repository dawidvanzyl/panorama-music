-- get_sibling_candidates
-- Every student who may be linked as someone's sibling, with the listing they
-- belong to. Sibling relationships are family facts and do not depend on either
-- child's enrolment, so unlike get_students this read spans both populations —
-- a student on the waiting list is offered alongside an enrolled one.
--
-- This is deliberately a read of its own rather than a relaxation of
-- get_students: that function's exclusion keeps the roster and the waiting list
-- mutually exclusive, and widening it would leak waiting-list students onto the
-- Students screen.
--
-- The population is the listing the student actually appears on; see
-- student_population, which the linked-siblings read shares.
--
-- Excluding the student being edited is the caller's concern: no student is
-- named here, and the wizard already filters out both the subject and the
-- siblings they already hold.

CREATE OR REPLACE FUNCTION students.get_sibling_candidates()
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
    SELECT s.student_id, s.first_name, s.last_name, s.date_of_birth, s.grade, s.class, s.phase, s.language,
           students.student_population(s.student_id) AS population
    FROM students.students s
    ORDER BY s.grade, s.class, s.last_name, s.first_name;
END;
$$;
