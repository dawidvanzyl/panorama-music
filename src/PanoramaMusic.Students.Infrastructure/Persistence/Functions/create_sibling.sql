-- create_sibling
-- Inserts one directional row into students.siblings. Called twice by
-- SiblingRepository.AddAsync (once per direction) so that linking A and B
-- records both (A, B) and (B, A) atomically within the ambient transaction.
-- ON CONFLICT DO NOTHING makes re-adding an existing link a no-op instead of
-- a primary-key violation.

CREATE OR REPLACE FUNCTION students.create_sibling(
    p_student_id UUID,
    p_sibling_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.siblings (student_id, sibling_id)
    VALUES (p_student_id, p_sibling_id)
    ON CONFLICT (student_id, sibling_id) DO NOTHING;
END;
$$;
