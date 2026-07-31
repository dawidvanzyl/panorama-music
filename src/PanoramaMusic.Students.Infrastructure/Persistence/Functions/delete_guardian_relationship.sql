-- Deletes a relationship type. The in-use rule lives in
-- DeleteGuardianRelationshipHandler, not here — the foreign key on
-- students.guardians is the database-level backstop, and the repository
-- translates a violation of it into a domain error.

-- An earlier revision on this branch returned INTEGER, and CREATE OR REPLACE
-- cannot change a return type — drop it so databases already carrying that
-- version are recreated cleanly.
DROP FUNCTION IF EXISTS students.delete_guardian_relationship(UUID);

CREATE OR REPLACE FUNCTION students.delete_guardian_relationship(
    p_guardian_relationship_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.guardian_relationships
    WHERE guardian_relationship_id = p_guardian_relationship_id;
END;
$$;
