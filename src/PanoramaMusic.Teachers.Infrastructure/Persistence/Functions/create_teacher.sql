-- create_teacher
-- Inserts a new teacher into teachers.teachers. p_teacher bundles the
-- writable fields as the teachers.teacher_input composite type - Postgres'
-- equivalent of a table-valued parameter - instead of one scalar parameter
-- per column. is_active always starts true on creation.

DROP FUNCTION IF EXISTS teachers.create_teacher(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION teachers.create_teacher(
    p_teacher_id UUID,
    p_teacher    teachers.teacher_input
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO teachers.teachers (teacher_id, first_name, surname, is_private, is_active)
    VALUES (
        p_teacher_id,
        (p_teacher).first_name,
        (p_teacher).surname,
        (p_teacher).is_private,
        TRUE
    );
END;
$$;
