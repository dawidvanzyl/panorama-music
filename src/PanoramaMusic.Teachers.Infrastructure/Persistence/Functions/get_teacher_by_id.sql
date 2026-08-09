-- get_teacher_by_id
-- Returns a single teacher row by id, or no rows if not found. The linked
-- account is returned as an id only; naming it is Identity's to answer, and the
-- application layer composes the two.

DROP FUNCTION IF EXISTS teachers.get_teacher_by_id(UUID);

CREATE OR REPLACE FUNCTION teachers.get_teacher_by_id(
    p_teacher_id UUID
)
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
    WHERE t.teacher_id = p_teacher_id;
END;
$$;
