-- update_extra_curricular
-- Corrects an activity's description and the phase it is offered to. Those two
-- are the whole of what an edit reaches: the practice times are maintained on
-- their own surface and are deliberately not touched here.
-- A description colliding with another activity in the same phase raises the
-- uq_extra_curriculars_description_phase violation rather than being pre-checked
-- here, so a race between two requests still ends in a refusal.

CREATE OR REPLACE FUNCTION students.update_extra_curricular(
    p_extra_curricular_id UUID,
    p_description         TEXT,
    p_phase               TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.extra_curriculars
    SET description = p_description,
        phase       = p_phase
    WHERE extra_curricular_id = p_extra_curricular_id;
END;
$$;
