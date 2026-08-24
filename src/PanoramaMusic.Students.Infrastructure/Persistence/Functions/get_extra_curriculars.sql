-- get_extra_curriculars
-- Joins each activity to the practice times it owns, so the whole list arrives
-- in one query rather than a slot lookup per activity. One row per practice
-- time; the repository groups them back into activities.
-- p_phase narrows the list to activities offered to that phase; NULL returns
-- them all.
-- Rows are ordered by description so activities read alphabetically, as the
-- interface shows them. Slot order within an activity is deliberately NOT set
-- here — day-of-week-from-Monday order is an invariant of the ExtraCurricular
-- aggregate, and restating it as a CASE expression would duplicate the rule.

CREATE OR REPLACE FUNCTION students.get_extra_curriculars(
    p_phase TEXT DEFAULT NULL
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
    WHERE p_phase IS NULL OR ec.phase = p_phase
    ORDER BY ec.description, ec.extra_curricular_id;
END;
$$;
