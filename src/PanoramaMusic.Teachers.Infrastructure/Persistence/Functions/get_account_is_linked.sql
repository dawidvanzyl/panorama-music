-- get_account_is_linked
-- Whether a teacher already claims the given login account. Reads only the
-- teachers schema: which accounts are claimed is this context's own fact, and
-- everything else about an account is Identity's to answer.

CREATE OR REPLACE FUNCTION teachers.get_account_is_linked(
    p_account_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM teachers.teachers t
        WHERE t.linked_account_id = p_account_id
    );
END;
$$;
