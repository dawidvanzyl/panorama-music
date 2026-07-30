-- Deletes the guardian record. student_guardians rows referencing it cascade
-- at the database level (see 09__student_guardians_table.sql).
CREATE OR REPLACE FUNCTION students.delete_guardian(
    p_guardian_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.guardians WHERE guardian_id = p_guardian_id;
END;
$$;
