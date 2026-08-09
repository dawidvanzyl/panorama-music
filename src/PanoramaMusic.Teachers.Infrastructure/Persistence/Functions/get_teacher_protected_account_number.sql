-- get_teacher_protected_account_number
-- Returns the protected account-number payload for one teacher, or no rows
-- when none have been captured. Kept apart from get_teacher_banking_details so
-- the protected column is read by exactly one code path — the reveal action —
-- rather than travelling on every ordinary read and being discarded later.

CREATE OR REPLACE FUNCTION teachers.get_teacher_protected_account_number(
    p_teacher_id UUID
)
RETURNS TABLE(
    account_number_protected TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT b.account_number_protected
    FROM teachers.banking_details b
    WHERE b.teacher_id = p_teacher_id;
END;
$$;
