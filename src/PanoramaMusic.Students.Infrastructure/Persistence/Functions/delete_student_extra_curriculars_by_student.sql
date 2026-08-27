-- delete_student_extra_curriculars_by_student
-- Every one of a student's assignments, in a single statement. This is what a
-- grade changing to Private runs: a Private-grade student is not part of the
-- school and takes part in nothing, so the whole set goes at once rather than a
-- delete per row.
-- Only the links go — neither the student nor any of the activities is affected.

CREATE OR REPLACE FUNCTION students.delete_student_extra_curriculars_by_student(
    p_student_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM students.student_extra_curriculars
    WHERE student_id = p_student_id;
END;
$$;
