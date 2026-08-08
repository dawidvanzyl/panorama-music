-- get_all_teacher_banking_details
-- Every captured set of banking details, in masked form, in one call. Exists so
-- rendering the roster's banking column costs one query rather than one per
-- teacher. Teachers without banking details simply have no row here — the
-- roster is composed in the application layer, which is also why this is a
-- query of its own rather than a join into get_teachers: banking details are a
-- separate aggregate with their own lifecycle, not a column on a teacher.
-- As everywhere outside the reveal action, the protected account number is not
-- selected.

CREATE OR REPLACE FUNCTION teachers.get_all_teacher_banking_details()
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
    FROM teachers.banking_details b;
END;
$$;
