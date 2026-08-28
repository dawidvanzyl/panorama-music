-- One slot per call. The activity and all of its slots are written inside the
-- request's ambient transaction, so they land together without this function
-- taking on more than a single insert.

CREATE OR REPLACE FUNCTION students.create_extra_curricular_practice_time(
    p_practice_time_id    UUID,
    p_extra_curricular_id UUID,
    p_day                 TEXT,
    p_start_time          TIME
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.extra_curricular_practice_times (practice_time_id, extra_curricular_id, day, start_time)
    VALUES (p_practice_time_id, p_extra_curricular_id, p_day, p_start_time);
END;
$$;
