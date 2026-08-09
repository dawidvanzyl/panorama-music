-- delete_teacher_banking_details
-- Removes a teacher's banking details outright. The protected account number
-- goes with the row and cannot be recovered; the audit entries recording what
-- happened to it remain, which is the retention boundary this milestone sets.

CREATE OR REPLACE FUNCTION teachers.delete_teacher_banking_details(
    p_teacher_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM teachers.banking_details
    WHERE teacher_id = p_teacher_id;
END;
$$;
