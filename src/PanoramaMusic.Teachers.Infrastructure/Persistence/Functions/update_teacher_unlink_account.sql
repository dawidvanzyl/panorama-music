-- update_teacher_unlink_account
-- Clears a teacher's login account link, leaving the teacher record itself
-- untouched. A link is never reassigned in place, so removal is its own
-- operation rather than a link to a different account.

CREATE OR REPLACE FUNCTION teachers.update_teacher_unlink_account(
    p_teacher_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.teachers
    SET linked_account_id = NULL
    WHERE teacher_id = p_teacher_id;
END;
$$;
