-- Backs the uniqueness check on create and rename. Matching is
-- case-insensitive so "mother" is not accepted alongside "Mother".
CREATE OR REPLACE FUNCTION students.get_guardian_relationship_by_name(
    p_name TEXT
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
    WHERE LOWER(gr.name) = LOWER(p_name);
END;
$$;
