-- student_course_exists
-- Whether the student already holds an enrollment in the course. A membership
-- test on its own index rather than a read of every enrollment the student
-- holds — the caller only needs the answer, not the rows. The
-- uq_student_courses_student_course constraint is still what settles a race;
-- this only buys the earlier, better-explained refusal.

CREATE OR REPLACE FUNCTION students.student_course_exists(
    p_student_id UUID,
    p_course_id  UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM students.student_courses
        WHERE student_id = p_student_id
          AND course_id = p_course_id
    );
END;
$$;
