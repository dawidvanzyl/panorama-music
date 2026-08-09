-- get_teacher_banking_details
-- Returns a teacher's banking details in masked form, or no rows when none
-- have been captured. The protected account number is deliberately not
-- selected here: this is the shape every read outside the reveal action gets,
-- and a column that is never returned cannot be leaked by one.

CREATE OR REPLACE FUNCTION teachers.get_teacher_banking_details(
    p_teacher_id UUID
)
RETURNS TABLE(
    teacher_id           UUID,
    bank                 TEXT,
    account_type         TEXT,
    branch_code          TEXT,
    account_number_last4 TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT b.teacher_id, b.bank, b.account_type, b.branch_code, b.account_number_last4
    FROM teachers.banking_details b
    WHERE b.teacher_id = p_teacher_id;
END;
$$;
