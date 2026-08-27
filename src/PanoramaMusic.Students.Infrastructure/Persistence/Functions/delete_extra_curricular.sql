-- delete_extra_curricular
-- Removes an activity. Its practice times go with it through the cascade on
-- extra_curricular_practice_times, which is what makes "a practice time cannot
-- outlive its activity" true in the schema rather than only in the use case —
-- so this stays a single delete and leaves no orphaned slot.
-- Whether the activity may go at all — no student takes part in it — is answered
-- by the use case before this runs.

CREATE OR REPLACE FUNCTION students.delete_extra_curricular(
    p_extra_curricular_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.extra_curriculars
    WHERE extra_curricular_id = p_extra_curricular_id;
END;
$$;
