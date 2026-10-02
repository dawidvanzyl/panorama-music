-- get_sibling_groups
-- For each given student id, walks the full students.siblings graph (both
-- directions are stored, so every link is a cycle) and returns the connected
-- component's key alongside the student's date of birth. No population,
-- enrolment or waiting-list filter is applied here — absent and
-- waiting-list-only students still connect a family.

CREATE OR REPLACE FUNCTION students.get_sibling_groups(
    p_student_ids UUID[]
)
RETURNS TABLE(
    student_id    UUID,
    group_key     UUID,
    date_of_birth DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE reach(origin_id, reached_id) AS (
        SELECT s.student_id, s.student_id
        FROM students.students s
        WHERE s.student_id = ANY(p_student_ids)

        UNION

        SELECT r.origin_id, sib.sibling_id
        FROM reach r
        JOIN students.siblings sib ON sib.student_id = r.reached_id
    )
    SELECT r.origin_id AS student_id,
           (array_agg(r.reached_id ORDER BY r.reached_id))[1] AS group_key,
           o.date_of_birth AS date_of_birth
    FROM reach r
    JOIN students.students o ON o.student_id = r.origin_id
    GROUP BY r.origin_id, o.date_of_birth;
END;
$$;
