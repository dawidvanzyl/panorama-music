-- get_teacher_by_id
-- Returns a single teacher row by id, or no rows if not found. The linked
-- account's email is joined in rather than looked up per teacher afterwards,
-- so naming the account on the record costs no extra round trip.

DROP FUNCTION IF EXISTS teachers.get_teacher_by_id(UUID);

CREATE OR REPLACE FUNCTION teachers.get_teacher_by_id(
    p_teacher_id UUID
)
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
    WHERE t.teacher_id = p_teacher_id;
END;
$$;
