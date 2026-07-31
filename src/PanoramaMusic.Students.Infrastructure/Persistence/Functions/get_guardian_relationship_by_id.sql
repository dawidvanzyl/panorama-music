CREATE OR REPLACE FUNCTION students.get_guardian_relationship_by_id(
    p_guardian_relationship_id UUID
)
RETURNS TABLE(
    guardian_relationship_id UUID,
    name                     TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT gr.guardian_relationship_id, gr.name
    FROM students.guardian_relationships gr
    WHERE gr.guardian_relationship_id = p_guardian_relationship_id;
END;
$$;
