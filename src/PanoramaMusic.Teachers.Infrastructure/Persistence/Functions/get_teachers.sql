-- get_teachers
-- Returns the full teacher roster in a single query. Accepts no filter
-- parameters - the API's list endpoint always returns the complete set. The
-- linked account's email is joined in so the roster can name each account
-- without a lookup per row.

DROP FUNCTION IF EXISTS teachers.get_teachers();

CREATE OR REPLACE FUNCTION teachers.get_teachers()
RETURNS TABLE(
    teacher_id            UUID,
    first_name            TEXT,
    surname               TEXT,
    is_private            BOOLEAN,
    is_active             BOOLEAN,
    linked_account_id     UUID,
    linked_account_email  TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.teacher_id, t.first_name, t.surname, t.is_private, t.is_active, t.linked_account_id, u.email
    FROM teachers.teachers t
    LEFT JOIN identity.users u ON u.user_id = t.linked_account_id
    ORDER BY t.surname, t.first_name;
END;
$$;
