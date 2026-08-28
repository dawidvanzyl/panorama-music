CREATE OR REPLACE FUNCTION students.create_extra_curricular(
    p_extra_curricular_id UUID,
    p_description         TEXT,
    p_phase               TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.extra_curriculars (extra_curricular_id, description, phase)
    VALUES (p_extra_curricular_id, p_description, p_phase);
END;
$$;
