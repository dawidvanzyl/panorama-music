-- create_student_course
-- The enrollment itself: the student, the course, the one assigned teacher and
-- the date. The instrument and step it may also record are their own write —
-- see create_student_instrument. A duplicate is left to the
-- uq_student_courses_student_course constraint rather than pre-checked here, so
-- two concurrent requests cannot both pass.

CREATE OR REPLACE FUNCTION students.create_student_course(
    p_student_course_id UUID,
    p_student_id        UUID,
    p_course_id         UUID,
    p_teacher_id        UUID,
    p_enrolled_date     DATE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO students.student_courses (student_course_id, student_id, course_id, teacher_id, enrolled_date)
    VALUES (p_student_course_id, p_student_id, p_course_id, p_teacher_id, p_enrolled_date);
END;
$$;
