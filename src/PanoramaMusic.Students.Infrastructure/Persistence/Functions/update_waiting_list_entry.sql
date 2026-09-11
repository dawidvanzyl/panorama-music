-- update_waiting_list_entry
-- Corrects the entry's own details. added_at is not a parameter and is never
-- written here: queue position is derived from it, so a row that could
-- reassign it could be moved up the queue by editing. Changing the lesson
-- structure may move the entry to the other occurrence type, and its position
-- there is re-derived on the next read from this same original added_at.

CREATE OR REPLACE FUNCTION students.update_waiting_list_entry(
    p_waiting_list_entry_id UUID,
    p_lesson_structure_id   UUID,
    p_instrument_type       TEXT,
    p_notes                 TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.waiting_list
    SET lesson_structure_id = p_lesson_structure_id,
        instrument_type     = p_instrument_type,
        notes               = p_notes
    WHERE waiting_list_entry_id = p_waiting_list_entry_id;
END;
$$;
