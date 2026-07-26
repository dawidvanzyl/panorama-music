CREATE OR REPLACE FUNCTION students.get_guardian_link_count(
    p_guardian_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    link_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO link_count
    FROM students.student_guardians
    WHERE guardian_id = p_guardian_id;

    RETURN link_count;
END;
$$;
