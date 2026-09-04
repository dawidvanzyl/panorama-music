-- get_waiting_list_entry_by_student_id
-- The entry a waiting-list student holds, joined to the student and lesson
-- structure the same way get_waiting_list_entry_by_id is. A student holds at
-- most one, so this returns either a single row or none — and none is what
-- distinguishes a student who is not a waiting-list student at all.
--
-- A student holding a course enrollment is excluded, the same rule
-- get_waiting_list carries. This read resolves the student that the waiting
-- list's own write and removal paths then update or delete, so it must answer
-- "is a waiting-list student", not the wider "holds a row in this table" — an
-- enrolled student can still hold a stale row, and their student record is not
-- this screen's to touch. get_waiting_list_entry_by_id deliberately does not
-- carry the exclusion: it is named by entry, writes only the entry, and hiding
-- a row the caller named by its own id would turn an entry that exists into a
-- silent not-found.

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
    WHERE wl.student_id = p_student_id
      AND NOT EXISTS (
          SELECT 1 FROM students.student_courses sc WHERE sc.student_id = wl.student_id
      );
END;
$$;
