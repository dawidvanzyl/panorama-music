-- get_student_courses
-- Joins each enrollment to its course and that course's lesson structure, and
-- left-joins the instrument and step recorded against it, so the whole list
-- arrives resolved in one round trip rather than a lookup per enrollment. The
-- left join is what lets a course type that records neither still return a row.
-- Naming the assigned teacher is another context's answer and is resolved
-- through the Students context's teacher-directory port, not here.

CREATE OR REPLACE FUNCTION students.get_student_courses(
    p_student_id UUID
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
    ORDER BY sc.enrolled_date, c.course_type;
END;
$$;
