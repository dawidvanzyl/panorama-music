-- create_student_extra_curricular
-- Assigns a student to an extra-curricular activity. The link carries nothing
-- beyond the pair, so this is the whole of the write. A duplicate is left to the
-- pk_student_extra_curriculars primary key rather than pre-checked here, so two
-- concurrent requests cannot both pass.

CREATE OR REPLACE FUNCTION students.create_student_extra_curricular(
    p_student_id          UUID,
    p_extra_curricular_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.student_extra_curriculars (student_id, extra_curricular_id)
    VALUES (p_student_id, p_extra_curricular_id);
END;
$$;
