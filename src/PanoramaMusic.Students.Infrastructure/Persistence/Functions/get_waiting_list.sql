-- get_waiting_list
-- Every waiting-list entry joined to the student it belongs to and the lesson
-- structure they are waiting for, so the whole list arrives resolved in one
-- round trip. A student holding a course enrollment is excluded: they are not
-- a waiting-list student regardless of what row this table still holds for
-- them, the same rule get_students enforces in the other direction.
--
-- Grouping by occurrence type, ordering by added_at within each group, and
-- deriving each entry's queue position are deliberately NOT done here — those
-- are the read handler's concern, not this query's, matching how
-- get_extra_curriculars leaves day-then-time slot order to the aggregate.

CREATE OR REPLACE FUNCTION students.get_waiting_list()
RETURNS TABLE(
    waiting_list_entry_id UUID,
    student_id            UUID,
    first_name             TEXT,
    last_name               TEXT,
    date_of_birth           DATE,
    grade                   TEXT,
    class                   TEXT,
    phase                   TEXT,
    language                TEXT,
    lesson_structure_id     UUID,
    lesson_type             TEXT,
    duration_type           TEXT,
    occurrence_type         TEXT,
    instrument_type         TEXT,
    notes                   TEXT,
    added_at                TIMESTAMPTZ
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
    WHERE NOT EXISTS (
        SELECT 1 FROM students.student_courses sc WHERE sc.student_id = wl.student_id
    );
END;
$$;
