CREATE OR REPLACE FUNCTION students.get_guardian_count_by_relationship(
    p_guardian_relationship_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    guardian_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO guardian_count
    FROM students.guardians
    WHERE guardian_relationship_id = p_guardian_relationship_id;

    RETURN guardian_count;
END;
$$;
