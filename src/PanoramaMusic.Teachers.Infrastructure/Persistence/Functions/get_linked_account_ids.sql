-- get_linked_account_ids
-- Every login account currently claimed by a teacher. The eligible-account set
-- is composed by subtracting this from the Teacher-role accounts Identity
-- supplies, so neither context queries the other's tables.

CREATE OR REPLACE FUNCTION teachers.get_linked_account_ids()
RETURNS TABLE(
    linked_account_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.linked_account_id
    FROM teachers.teachers t
    WHERE t.linked_account_id IS NOT NULL;
END;
$$;
