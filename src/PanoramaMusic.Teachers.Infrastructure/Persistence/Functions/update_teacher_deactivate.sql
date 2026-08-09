-- update_teacher_deactivate
-- Marks a teacher inactive. The record and its history are preserved; only
-- delete_teacher removes them. Deleting the teacher's banking details is a
-- separate single-purpose function called in the same transaction, so neither
-- write can be applied without the other.

CREATE OR REPLACE FUNCTION teachers.update_teacher_deactivate(
    p_teacher_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.teachers
    SET is_active = FALSE
    WHERE teacher_id = p_teacher_id;
END;
$$;
