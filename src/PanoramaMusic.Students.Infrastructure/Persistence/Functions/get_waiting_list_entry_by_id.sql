-- get_waiting_list_entry_by_id
-- One waiting-list entry joined to the student it belongs to and the lesson
-- structure they are waiting for, addressed by its own identifier.
--
-- Unlike get_waiting_list this applies no enrollment exclusion: the caller has
-- named one specific row to maintain, and hiding it would turn an entry that
-- exists into a silent not-found.

CREATE OR REPLACE FUNCTION students.get_waiting_list_entry_by_id(
    p_waiting_list_entry_id UUID
)
RETURNS TABLE(
    waiting_list_entry_id UUID,
    student_id            UUID,
    first_name            TEXT,
    last_name             TEXT,
    date_of_birth         DATE,
    grade                 TEXT,
    class                 TEXT,
    phase                 TEXT,
    language              TEXT,
    lesson_structure_id   UUID,
    lesson_type           TEXT,
    duration_type         TEXT,
    occurrence_type       TEXT,
    instrument_type       TEXT,
    notes                 TEXT,
    added_at              TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT wl.waiting_list_entry_id, wl.student_id,
           s.first_name, s.last_name, s.date_of_birth, s.grade, s.class, s.phase, s.language,
           ls.lesson_structure_id, ls.lesson_type, ls.duration_type, ls.occurrence_type,
           wl.instrument_type, wl.notes, wl.added_at
    FROM students.waiting_list wl
    JOIN students.students s ON s.student_id = wl.student_id
    JOIN students.lesson_structures ls ON ls.lesson_structure_id = wl.lesson_structure_id
    WHERE wl.waiting_list_entry_id = p_waiting_list_entry_id;
END;
$$;
