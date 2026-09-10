-- get_missing_enrolled_sibling_guardian_links
-- The links that would give every ENROLLED sibling of p_student_id each
-- guardian p_student_id holds. One row per link that does not exist yet, so a
-- family is brought into line in a single query rather than one lookup per
-- sibling.
--
-- Siblings still on the waiting list are excluded: a guardian added to a
-- waiting-list student already reached them when it was added, and only an
-- enrolled sibling was ever held back from.
--
-- The NOT EXISTS is what makes this idempotent — a guardian a sibling already
-- holds produces no row, so running it against a family that is already
-- consistent returns nothing.

CREATE OR REPLACE FUNCTION students.get_missing_enrolled_sibling_guardian_links(
    p_student_id UUID
)
RETURNS TABLE(
    student_id  UUID,
    guardian_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT sib.sibling_id, own.guardian_id
    FROM students.siblings sib
    JOIN students.student_guardians own ON own.student_id = p_student_id
    WHERE sib.student_id = p_student_id
      AND EXISTS (
          SELECT 1
          FROM students.student_courses sc
          WHERE sc.student_id = sib.sibling_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM students.student_guardians theirs
          WHERE theirs.student_id = sib.sibling_id
            AND theirs.guardian_id = own.guardian_id
      );
END;
$$;
