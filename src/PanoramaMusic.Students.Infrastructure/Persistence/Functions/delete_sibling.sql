-- delete_sibling
-- Deletes one directional row from students.siblings. Called twice by
-- SiblingRepository.DeleteAsync (once per direction) so that removing the
-- link between A and B removes both (A, B) and (B, A) atomically within the
-- ambient transaction.

CREATE OR REPLACE FUNCTION students.delete_sibling(
    p_student_id UUID,
    p_sibling_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.siblings WHERE student_id = p_student_id AND sibling_id = p_sibling_id;
END;
$$;
