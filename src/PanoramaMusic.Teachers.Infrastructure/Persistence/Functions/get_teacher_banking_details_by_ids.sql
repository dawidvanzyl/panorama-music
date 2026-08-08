-- get_teacher_banking_details_by_ids
-- Every captured set of banking details for the given teachers, in masked
-- form, in one call. Exists so composing a roster's banking column costs one
-- query rather than one per teacher — while still reading only the teachers
-- the caller actually asked about, so the work scales with the request rather
-- than with the table.
-- A separate query rather than a join into get_teachers because banking
-- details are their own aggregate with their own lifecycle, not a column on a
-- teacher. Teachers without banking details simply have no row here.
-- As everywhere outside the reveal action, the protected account number is not
-- selected.

CREATE OR REPLACE FUNCTION teachers.get_teacher_banking_details_by_ids(
    p_teacher_ids UUID[]
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
    WHERE b.teacher_id = ANY (p_teacher_ids);
END;
$$;
