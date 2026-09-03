-- create_waiting_list_entry
-- Captures a student onto the waiting list. A duplicate is left to the
-- uq_waiting_list_student constraint rather than pre-checked here, so two
-- concurrent requests cannot both pass — the same reasoning
-- create_student_course follows for a duplicate enrollment.

CREATE OR REPLACE FUNCTION students.create_waiting_list_entry(
    p_waiting_list_entry_id UUID,
    p_student_id            UUID,
    p_lesson_structure_id   UUID,
    p_instrument_type       TEXT,
    p_notes                 TEXT,
    p_added_at              TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.waiting_list
        (waiting_list_entry_id, student_id, lesson_structure_id, instrument_type, notes, added_at)
    VALUES
        (p_waiting_list_entry_id, p_student_id, p_lesson_structure_id, p_instrument_type, p_notes, p_added_at);
END;
$$;
