CREATE OR REPLACE FUNCTION students.update_guardian_relationship(
    p_guardian_relationship_id UUID,
    p_name                     TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.guardian_relationships
    SET name = p_name
    WHERE guardian_relationship_id = p_guardian_relationship_id;
END;
$$;
