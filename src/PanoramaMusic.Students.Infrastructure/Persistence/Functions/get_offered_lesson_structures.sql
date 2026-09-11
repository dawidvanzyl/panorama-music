-- get_offered_lesson_structures
-- The seeded combinations the school actually runs an instrument course under.
-- Distinct from get_lesson_structures, which returns the whole seeded grid:
-- that grid is the space a course may be created against, and the course
-- catalogue is what narrows it to what is on offer.
-- Only Instrument courses count. A waiting-list entry records the instrument a
-- student is waiting to take up, so it is a wait for an instrument course; a
-- Theory course under the same structure teaches nobody an instrument and does
-- not make the combination offerable.
CREATE OR REPLACE FUNCTION students.get_offered_lesson_structures()
RETURNS TABLE(
    lesson_structure_id UUID,
    lesson_type         TEXT,
    duration_type       TEXT,
    occurrence_type     TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT ls.lesson_structure_id, ls.lesson_type, ls.duration_type, ls.occurrence_type
    FROM students.lesson_structures ls
    WHERE EXISTS (
        SELECT 1
        FROM students.courses c
        WHERE c.lesson_structure_id = ls.lesson_structure_id
          AND c.course_type = 'Instrument'
    )
    ORDER BY ls.lesson_type, ls.duration_type, ls.occurrence_type;
END;
$$;
