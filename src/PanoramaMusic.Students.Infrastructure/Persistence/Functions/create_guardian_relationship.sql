CREATE OR REPLACE FUNCTION students.create_guardian_relationship(
    p_guardian_relationship_id UUID,
    p_name                     TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.guardian_relationships (guardian_relationship_id, name)
    VALUES (p_guardian_relationship_id, p_name);
END;
$$;
