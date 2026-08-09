-- update_teacher_banking_details
-- Updates an existing set of banking details. The stored number cannot be read
-- back into the edit form, so an edit that leaves the account number alone
-- arrives here with both account-number parameters NULL and COALESCE keeps
-- what is already stored. The protected payload and its last four digits are
-- always written together — they describe the same number, and letting one
-- change without the other would make the masked display lie about what is
-- stored.

CREATE OR REPLACE FUNCTION teachers.update_teacher_banking_details(
    p_teacher_id               UUID,
    p_bank                     TEXT,
    p_account_type             TEXT,
    p_branch_code              TEXT,
    p_account_number_protected TEXT,
    p_account_number_last4     TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.banking_details
    SET bank                     = p_bank,
        account_type             = p_account_type,
        branch_code              = p_branch_code,
        account_number_protected = COALESCE(p_account_number_protected, account_number_protected),
        account_number_last4     = COALESCE(p_account_number_last4, account_number_last4),
        updated_at               = NOW()
    WHERE teacher_id = p_teacher_id;
END;
$$;
