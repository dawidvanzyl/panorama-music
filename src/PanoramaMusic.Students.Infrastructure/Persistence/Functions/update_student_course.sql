-- update_student_course
-- The assigned teacher is the whole of an enrollment's own mutable state; the
-- student, the course and the enrolled date are settled at enrollment and are
-- not writable here. The instrument and step the enrollment records belong to
-- their own table and are their own writes — see delete_student_instrument and
-- create_student_instrument.

CREATE OR REPLACE FUNCTION students.update_student_course(
    p_student_course_id UUID,
    p_teacher_id        UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.student_courses
    SET teacher_id = p_teacher_id
    WHERE student_course_id = p_student_course_id;
END;
$$;
