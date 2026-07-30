CREATE OR REPLACE FUNCTION students.get_guardians_by_student_id(
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
    SELECT g.guardian_id, g.guardian_relationship_id, g.first_name, g.surname, g.cell, g.email,
           g.receives_correspondence, g.responsible_for_payment, g.married
    FROM students.student_guardians sg
    JOIN students.guardians g ON g.guardian_id = sg.guardian_id
    WHERE sg.student_id = p_student_id;
END;
$$;
