-- update_teacher_reactivate
-- Returns a deactivated teacher to active. Nothing else is restored — the
-- banking details deleted at deactivation are not recoverable and must be
-- captured again.

CREATE OR REPLACE FUNCTION teachers.update_teacher_reactivate(
    p_teacher_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.teachers
    SET is_active = TRUE
    WHERE teacher_id = p_teacher_id;
END;
$$;
