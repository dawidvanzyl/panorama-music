-- student_population
-- Which of the two listings a student belongs to. Defined once, here, because
-- two reads need it and a second copy of the condition is how the two would
-- come to disagree.
--
-- The answer mirrors the listings exactly and between them they cover every
-- student: 'WaitingList' is the narrower set get_waiting_list returns — holds an
-- entry, holds no enrollment — and everyone else is the roster's, matching
-- get_students, including a student carrying a stale entry alongside an
-- enrollment. No student is in both, and none is in neither.

CREATE OR REPLACE FUNCTION students.student_population(
    p_student_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM students.waiting_list wl WHERE wl.student_id = p_student_id)
       AND NOT EXISTS (SELECT 1 FROM students.student_courses sc WHERE sc.student_id = p_student_id)
    THEN
        RETURN 'WaitingList';
    END IF;

    RETURN 'Enrolled';
END;
$$;
