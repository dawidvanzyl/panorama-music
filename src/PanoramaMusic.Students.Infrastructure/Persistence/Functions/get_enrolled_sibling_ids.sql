-- The ids of this student's siblings who hold a course enrollment. Answered in
-- one query so a caller that has to treat enrolled and waiting siblings
-- differently does not test each sibling in turn.
CREATE OR REPLACE FUNCTION students.get_enrolled_sibling_ids(
    p_student_id UUID
)
RETURNS TABLE(
    sibling_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT sib.sibling_id
    FROM students.siblings sib
    WHERE sib.student_id = p_student_id
      AND EXISTS (
          SELECT 1
          FROM students.student_courses sc
          WHERE sc.student_id = sib.sibling_id
      );
END;
$$;
