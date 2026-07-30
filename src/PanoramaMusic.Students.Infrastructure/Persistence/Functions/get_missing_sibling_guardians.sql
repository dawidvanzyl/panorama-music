-- Guardians linked to any of the student's siblings but not to the student
-- itself — the set a "Sync Guardians" action would add. Computed entirely
-- server-side to avoid an N+1 per-sibling lookup.
CREATE OR REPLACE FUNCTION students.get_missing_sibling_guardians(
    p_student_id UUID
)
RETURNS TABLE(
    guardian_id              UUID,
    guardian_relationship_id UUID,
    first_name               TEXT,
    surname                  TEXT,
    cell                     TEXT,
    email                    TEXT,
    receives_correspondence  BOOLEAN,
    responsible_for_payment  BOOLEAN,
    married                  BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT g.guardian_id, g.guardian_relationship_id, g.first_name, g.surname, g.cell, g.email,
           g.receives_correspondence, g.responsible_for_payment, g.married
    FROM students.siblings sib
    JOIN students.student_guardians sg ON sg.student_id = sib.sibling_id
    JOIN students.guardians g ON g.guardian_id = sg.guardian_id
    WHERE sib.student_id = p_student_id
      AND NOT EXISTS (
          SELECT 1 FROM students.student_guardians own
          WHERE own.student_id = p_student_id AND own.guardian_id = sg.guardian_id
      );
END;
$$;
