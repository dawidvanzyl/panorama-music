-- create_teacher_banking_details
-- Captures a teacher's banking details for the first time. The primary key on
-- teacher_id is what refuses a second set: two requests can both pass the
-- application's "none captured yet" read before either writes, and the key is
-- what actually settles it. The repository translates that violation into the
-- same refusal the read would have produced.

CREATE OR REPLACE FUNCTION teachers.create_teacher_banking_details(
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
    INSERT INTO teachers.banking_details (
        teacher_id,
        bank,
        account_type,
        branch_code,
        account_number_protected,
        account_number_last4
    )
    VALUES (
        p_teacher_id,
        p_bank,
        p_account_type,
        p_branch_code,
        p_account_number_protected,
        p_account_number_last4
    );
END;
$$;
