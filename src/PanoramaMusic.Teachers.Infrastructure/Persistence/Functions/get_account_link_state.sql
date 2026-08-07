-- get_account_link_state
-- Returns everything the Teachers context needs to decide whether a specific
-- login account may be linked - its email, whether it holds the Teacher role,
-- and whether a teacher already claims it - in one pass. No rows means no such
-- account.
-- Both joins are left joins so a missing role or a missing link produces a
-- false rather than dropping the account's row, and neither can multiply rows:
-- user_roles is keyed on (user_id, role), and teachers.linked_account_id is
-- uniquely indexed.

DROP FUNCTION IF EXISTS teachers.get_account_link_state(UUID);

CREATE OR REPLACE FUNCTION teachers.get_account_link_state(
    p_account_id UUID
)
RETURNS TABLE(
    email            TEXT,
    has_teacher_role BOOLEAN,
    is_linked        BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.email,
        r.user_id IS NOT NULL,
        t.teacher_id IS NOT NULL
    FROM identity.users u
    LEFT JOIN identity.user_roles r
        ON r.user_id = u.user_id
       AND r.role = 'Teacher'
    LEFT JOIN teachers.teachers t
        ON t.linked_account_id = u.user_id
    WHERE u.user_id = p_account_id;
END;
$$;
