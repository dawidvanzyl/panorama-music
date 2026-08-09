-- get_teacher_by_linked_account_id
-- Returns the teacher claiming a login account, or no rows when that account is
-- linked to none. This is how a self-service caller's own record is found: the
-- account id comes from the signed-in token, never from the request, so the
-- lookup starts at the account rather than at a supplied teacher id.

DROP FUNCTION IF EXISTS teachers.get_teacher_by_linked_account_id(UUID);

CREATE OR REPLACE FUNCTION teachers.get_teacher_by_linked_account_id(
    p_account_id UUID
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
    WHERE t.linked_account_id = p_account_id;
END;
$$;
