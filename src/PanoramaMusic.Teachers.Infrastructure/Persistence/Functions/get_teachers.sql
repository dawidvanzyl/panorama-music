-- get_teachers
-- Returns the full teacher roster in a single query. Accepts no filter
-- parameters — the API's list endpoint always returns the complete set.

DROP FUNCTION IF EXISTS teachers.get_teachers();

CREATE OR REPLACE FUNCTION teachers.get_teachers()
RETURNS TABLE(
    teacher_id          UUID,
    first_name          TEXT,
    surname             TEXT,
    is_private          BOOLEAN,
    is_active           BOOLEAN,
    linked_account_id   UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.teacher_id, t.first_name, t.surname, t.is_private, t.is_active, t.linked_account_id
    FROM teachers.teachers t
    ORDER BY t.surname, t.first_name;
END;
$$;
