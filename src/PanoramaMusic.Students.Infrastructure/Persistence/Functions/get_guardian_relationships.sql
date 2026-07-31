CREATE OR REPLACE FUNCTION students.get_guardian_relationships()
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
    ORDER BY gr.name;
END;
$$;
