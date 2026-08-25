-- get_extra_curricular_by_id
-- One activity joined to the practice times it owns, in the same row shape as
-- get_extra_curriculars so the repository folds both with the same mapping.
-- Slot order is deliberately NOT set here — day-of-week-from-Monday order is an
-- invariant of the ExtraCurricular aggregate, and restating it as a CASE
-- expression would duplicate the rule.
-- The join means an activity holding no practice times returns no rows and so
-- reads back as absent. That state is one the ExtraCurricular aggregate prevents
-- — it refuses to be created without a slot and refuses to give up its last one
-- — and not one the schema itself constrains, so this is a consequence of the
-- domain rule rather than a guarantee of the table.

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
