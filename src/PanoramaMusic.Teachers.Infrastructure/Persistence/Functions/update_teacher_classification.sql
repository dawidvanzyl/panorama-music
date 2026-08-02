-- update_teacher_classification
-- Updates an existing teacher's employment classification only. Kept separate
-- from update_teacher_profile so the flag can be persisted on its own, without
-- round-tripping the profile names.

CREATE OR REPLACE FUNCTION teachers.update_teacher_classification(
    p_teacher_id UUID,
    p_is_private BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.teachers
    SET is_private = p_is_private
    WHERE teacher_id = p_teacher_id;
END;
$$;
