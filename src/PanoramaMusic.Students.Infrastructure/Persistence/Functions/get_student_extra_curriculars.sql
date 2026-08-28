-- get_student_extra_curriculars
-- The activities a student takes part in, joined to the practice times each one
-- owns, so the whole list arrives in one query rather than an activity lookup
-- per assignment and a slot lookup per activity. One row per practice time; the
-- repository groups them back into activities.
-- Rows are ordered by description so activities read alphabetically, as the
-- interface shows them. Slot order within an activity is deliberately NOT set
-- here — day-of-week-from-Monday order is an invariant of the ExtraCurricular
-- aggregate, and restating it as a CASE expression would duplicate the rule.

CREATE OR REPLACE FUNCTION students.get_student_extra_curriculars(
    p_student_id UUID
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
    FROM students.student_extra_curriculars sec
    JOIN students.extra_curriculars ec
        ON ec.extra_curricular_id = sec.extra_curricular_id
    JOIN students.extra_curricular_practice_times pt
        ON pt.extra_curricular_id = ec.extra_curricular_id
    WHERE sec.student_id = p_student_id
    ORDER BY ec.description, ec.extra_curricular_id;
END;
$$;
