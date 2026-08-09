-- update_teacher_link_account
-- Attaches a login account to a teacher. Kept separate from the profile and
-- classification updates because a link is established or removed on its own,
-- never as part of editing the rest of the record.

CREATE OR REPLACE FUNCTION teachers.update_teacher_link_account(
    p_teacher_id UUID,
    p_account_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.teachers
    SET linked_account_id = p_account_id
    WHERE teacher_id = p_teacher_id;
END;
$$;
