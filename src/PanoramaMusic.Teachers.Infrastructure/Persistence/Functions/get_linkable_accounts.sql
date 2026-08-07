-- get_linkable_accounts
-- Returns the login accounts that may be offered for linking: those holding
-- the Teacher role and not already claimed by a teacher. Eligibility is
-- resolved here rather than by filtering a fuller list in the client, because
-- it is a correctness constraint on what may be linked, not a presentation
-- choice about what to show.
-- Neither join can multiply rows: user_roles is keyed on (user_id, role), and
-- teachers.linked_account_id is uniquely indexed.

DROP FUNCTION IF EXISTS teachers.get_linkable_accounts();

CREATE OR REPLACE FUNCTION teachers.get_linkable_accounts()
RETURNS TABLE(
    account_id UUID,
    email      TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.email
    FROM identity.users u
    INNER JOIN identity.user_roles r
        ON r.user_id = u.user_id
       AND r.role = 'Teacher'
    LEFT JOIN teachers.teachers t
        ON t.linked_account_id = u.user_id
    WHERE t.teacher_id IS NULL
    ORDER BY u.email;
END;
$$;
