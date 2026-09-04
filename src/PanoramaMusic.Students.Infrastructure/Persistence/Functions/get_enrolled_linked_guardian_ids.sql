-- Of the guardians reachable from one student — their own, plus those held by
-- any of their siblings — the ones linked to at least one student who holds a
-- course enrollment. A guardian is a single row shared across a sibling group,
-- so editing one of these would rewrite a record an enrolled student depends on.
--
-- The sibling half is included so the "guardians your sibling has and you do
-- not" preview can be answered from the same set, and the whole thing is one
-- query rather than a per-guardian lookup.
CREATE OR REPLACE FUNCTION students.get_enrolled_linked_guardian_ids(
    p_student_id UUID
)
RETURNS TABLE(
    guardian_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT sg.guardian_id
    FROM students.student_guardians sg
    WHERE sg.guardian_id IN (
        SELECT own.guardian_id
        FROM students.student_guardians own
        WHERE own.student_id = p_student_id
        UNION
        SELECT sib_g.guardian_id
        FROM students.siblings sib
        JOIN students.student_guardians sib_g ON sib_g.student_id = sib.sibling_id
        WHERE sib.student_id = p_student_id
    )
    AND EXISTS (
        SELECT 1
        FROM students.student_courses sc
        WHERE sc.student_id = sg.student_id
    );
END;
$$;
