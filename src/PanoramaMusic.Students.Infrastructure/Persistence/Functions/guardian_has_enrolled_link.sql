-- Whether this guardian is linked to any student holding a course enrollment.
-- Addresses the guardian by its own id, for the endpoints that do the same —
-- there is no student in scope there to reach it through.
CREATE OR REPLACE FUNCTION students.guardian_has_enrolled_link(
    p_guardian_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM students.student_guardians sg
        JOIN students.student_courses sc ON sc.student_id = sg.student_id
        WHERE sg.guardian_id = p_guardian_id
    );
END;
$$;
