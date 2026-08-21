-- get_student_course_by_id
-- One enrollment, joined to its course and that course's lesson structure and
-- left-joined to the instrument and step recorded against it, in the same shape
-- get_student_courses returns a list in. Keyed by the student as well as by the
-- enrollment, exactly as the route addresses it, so one student's enrollment is
-- never reached through another's.

CREATE OR REPLACE FUNCTION students.get_student_course_by_id(
    p_student_id        UUID,
    p_student_course_id UUID
)
RETURNS TABLE(
    student_course_id   UUID,
    student_id          UUID,
    course_id           UUID,
    course_type         TEXT,
    cost                NUMERIC,
    lesson_structure_id UUID,
    lesson_type         TEXT,
    duration_type       TEXT,
    occurrence_type     TEXT,
    teacher_id          UUID,
    instrument_type     TEXT,
    step_type           TEXT,
    enrolled_date       DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT sc.student_course_id, sc.student_id, c.course_id, c.course_type, c.cost,
           c.lesson_structure_id, ls.lesson_type, ls.duration_type, ls.occurrence_type,
           sc.teacher_id, si.instrument_type, si.step_type, sc.enrolled_date
    FROM students.student_courses sc
    JOIN students.courses c ON c.course_id = sc.course_id
    JOIN students.lesson_structures ls ON ls.lesson_structure_id = c.lesson_structure_id
    LEFT JOIN students.student_instruments si ON si.student_course_id = sc.student_course_id
    WHERE sc.student_id = p_student_id
      AND sc.student_course_id = p_student_course_id;
END;
$$;
