CREATE OR REPLACE FUNCTION students.get_lesson_structures()
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
    ORDER BY ls.lesson_type, ls.duration_type, ls.occurrence_type;
END;
$$;
