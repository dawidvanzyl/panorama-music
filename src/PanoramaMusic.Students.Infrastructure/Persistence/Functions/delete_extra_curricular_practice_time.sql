-- One slot per call, addressed by its own identity. The owning activity is part
-- of the predicate so a slot can never be deleted through the wrong activity —
-- two activities may legitimately hold the same day and start time.
-- Whether the slot may go at all is the ExtraCurricular aggregate's rule (an
-- activity must keep at least one), not this function's.

CREATE OR REPLACE FUNCTION students.delete_extra_curricular_practice_time(
    p_practice_time_id    UUID,
    p_extra_curricular_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.extra_curricular_practice_times
    WHERE practice_time_id = p_practice_time_id
      AND extra_curricular_id = p_extra_curricular_id;
END;
$$;
