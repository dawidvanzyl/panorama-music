-- Deletes a relationship type only while no guardian references it, and reports
-- how many rows it removed. The NOT EXISTS guard makes the in-use check and the
-- delete a single atomic statement, so a guardian created against the type after
-- the caller's count check cannot slip through into a foreign-key violation.
-- Returns INTEGER where the original returned void, which CREATE OR REPLACE
-- cannot do in place — drop the previous signature first.
DROP FUNCTION IF EXISTS students.delete_guardian_relationship(UUID);

CREATE OR REPLACE FUNCTION students.delete_guardian_relationship(
    p_guardian_relationship_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM students.guardian_relationships gr
    WHERE gr.guardian_relationship_id = p_guardian_relationship_id
      AND NOT EXISTS (
          SELECT 1
          FROM students.guardians g
          WHERE g.guardian_relationship_id = p_guardian_relationship_id
      );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
