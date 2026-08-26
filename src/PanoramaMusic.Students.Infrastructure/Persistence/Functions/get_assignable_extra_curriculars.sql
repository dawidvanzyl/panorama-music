-- get_assignable_extra_curriculars
-- The activities a student may be assigned to: those offered to the student's
-- own phase that they do not already take part in. Both narrowings are done
-- here, against the student's stored phase, so the caller neither pulls back the
-- whole catalogue to filter it nor has to state the phase it is asking about.
-- A student whose phase is not recorded matches no activity and so may be
-- assigned to none — the equality below answers that without a special case.
-- Joined to the practice times as get_student_extra_curriculars is, and ordered
-- the same way, for the same reasons.

CREATE OR REPLACE FUNCTION students.get_assignable_extra_curriculars(
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
    FROM students.students s
    JOIN students.extra_curriculars ec
        ON ec.phase = s.phase
    JOIN students.extra_curricular_practice_times pt
        ON pt.extra_curricular_id = ec.extra_curricular_id
    WHERE s.student_id = p_student_id
      AND NOT EXISTS (
          SELECT 1
          FROM students.student_extra_curriculars sec
          WHERE sec.student_id = s.student_id
            AND sec.extra_curricular_id = ec.extra_curricular_id
      )
    ORDER BY ec.description, ec.extra_curricular_id;
END;
$$;
