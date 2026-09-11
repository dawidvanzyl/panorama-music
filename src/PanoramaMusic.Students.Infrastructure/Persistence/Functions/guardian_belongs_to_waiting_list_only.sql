-- guardian_belongs_to_waiting_list_only
-- Whether every student linked to this guardian is a waiting-list student —
-- one who holds a waiting-list entry and no course enrollment, the same
-- narrower set get_waiting_list_entry_by_student_id resolves.
--
-- The guardian endpoints address a guardian by its own id with no student in
-- scope, so this is what tells an edit made through the waiting list from one
-- made through the roster for the audit record. It is deliberately stricter
-- than guardian_has_enrolled_link, which asks only whether an enrolled student
-- depends on the row: a guardian whose only student was added to the roster and
-- not yet enrolled belongs to the roster, and has no enrolled link either.
--
-- A guardian with no links at all is not a waiting-list guardian; a guardian
-- never exists standalone, so that state only arises mid-transaction.
CREATE OR REPLACE FUNCTION students.guardian_belongs_to_waiting_list_only(
    p_guardian_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM students.student_guardians sg
        WHERE sg.guardian_id = p_guardian_id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM students.student_guardians sg
        WHERE sg.guardian_id = p_guardian_id
          AND (
              NOT EXISTS (
                  SELECT 1 FROM students.waiting_list wl WHERE wl.student_id = sg.student_id
              )
              OR EXISTS (
                  SELECT 1 FROM students.student_courses sc WHERE sc.student_id = sg.student_id
              )
          )
    );
END;
$$;
