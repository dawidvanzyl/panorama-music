-- student_extra_curricular_exists
-- Whether the student already takes part in the activity. A membership test on
-- the primary key rather than a read of every assignment they hold — the caller
-- only needs the answer, not the rows. The key is still what settles a race
-- between two requests; this only buys the earlier, better-explained refusal.

CREATE OR REPLACE FUNCTION students.student_extra_curricular_exists(
    p_student_id          UUID,
    p_extra_curricular_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM students.student_extra_curriculars
        WHERE student_id = p_student_id
          AND extra_curricular_id = p_extra_curricular_id
    );
END;
$$;
