-- get_extra_curricular_by_id
-- One activity joined to the practice times it owns, in the same row shape as
-- get_extra_curriculars so the repository folds both with the same mapping.
-- Slot order is deliberately NOT set here — day-of-week-from-Monday order is an
-- invariant of the ExtraCurricular aggregate, and restating it as a CASE
-- expression would duplicate the rule.
-- An activity with no practice times returns no rows, which the schema's
-- at-least-one rule makes unreachable.

CREATE OR REPLACE FUNCTION students.get_extra_curricular_by_id(
    p_extra_curricular_id UUID
)
RETURNS TABLE(
    extra_curricular_id UUID,
    description         TEXT,
    phase               TEXT,
    practice_time_id    UUID,
    day                 TEXT,
    start_time          TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT ec.extra_curricular_id, ec.description, ec.phase,
           pt.practice_time_id, pt.day, pt.start_time
    FROM students.extra_curriculars ec
    JOIN students.extra_curricular_practice_times pt
        ON pt.extra_curricular_id = ec.extra_curricular_id
    WHERE ec.extra_curricular_id = p_extra_curricular_id;
END;
$$;
