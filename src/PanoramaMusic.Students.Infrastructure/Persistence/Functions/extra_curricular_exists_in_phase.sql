-- extra_curricular_exists_in_phase
-- Whether the phase already offers an activity carrying that description. The
-- excluded identifier is how an edit avoids colliding with itself: renaming an
-- activity to the description and phase it already holds is not a duplicate.
-- A NULL exclusion matches nothing, which is the create path.
-- The uq_extra_curriculars_description_phase constraint is still what settles a
-- race between two requests; this only buys the earlier, better-explained
-- refusal.

CREATE OR REPLACE FUNCTION students.extra_curricular_exists_in_phase(
    p_description         TEXT,
    p_phase               TEXT,
    p_excluding_extra_curricular_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM students.extra_curriculars
        WHERE description = p_description
          AND phase = p_phase
          AND (p_excluding_extra_curricular_id IS NULL
               OR extra_curricular_id <> p_excluding_extra_curricular_id)
    );
END;
$$;
