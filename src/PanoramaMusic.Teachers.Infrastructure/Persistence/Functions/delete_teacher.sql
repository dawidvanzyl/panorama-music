-- delete_teacher
-- Permanently removes a teacher record. Any banking details still keyed to the
-- teacher go with it through the ON DELETE CASCADE on teachers.banking_details;
-- in practice there are none, since deactivation — which delete requires — has
-- already deleted them. The audit trail outlives the row and is what survives.

CREATE OR REPLACE FUNCTION teachers.delete_teacher(
    p_teacher_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM teachers.teachers
    WHERE teacher_id = p_teacher_id;
END;
$$;
