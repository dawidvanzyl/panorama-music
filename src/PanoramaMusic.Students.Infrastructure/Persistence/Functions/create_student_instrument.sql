-- create_student_instrument
-- The instrument and step belong to one enrollment, so this is its own
-- single-purpose write called alongside create_student_course within the
-- request's ambient transaction rather than folded into it.

CREATE OR REPLACE FUNCTION students.create_student_instrument(
    p_student_course_id UUID,
    p_instrument_type   TEXT,
    p_step_type         TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.student_instruments (student_course_id, instrument_type, step_type)
    VALUES (p_student_course_id, p_instrument_type, p_step_type);
END;
$$;
