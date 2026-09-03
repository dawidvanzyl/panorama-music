-- get_waiting_list_entry_by_student_id
-- The entry a student holds, joined to the student and lesson structure the
-- same way get_waiting_list_entry_by_id is. A student holds at most one, so
-- this returns either a single row or none — and none is what distinguishes a
-- student who is not on the waiting list at all.

CREATE OR REPLACE FUNCTION students.get_waiting_list_entry_by_student_id(
    p_student_id UUID
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
    WHERE wl.student_id = p_student_id;
END;
$$;
