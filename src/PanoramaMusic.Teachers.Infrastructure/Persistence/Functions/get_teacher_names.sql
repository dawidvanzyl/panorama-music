-- get_teacher_names
-- The narrow teacher projection the Reporting context reads for its Course ·
-- Teacher filter and column: id, name and active status only. Nothing else
-- teachers.teachers carries is ever returned.

CREATE OR REPLACE FUNCTION teachers.get_teacher_names()
RETURNS TABLE(
    teacher_id UUID,
    first_name TEXT,
    surname    TEXT,
    is_active  BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.teacher_id, t.first_name, t.surname, t.is_active
    FROM teachers.teachers t
    ORDER BY t.surname, t.first_name, t.teacher_id;
END;
$$;
