-- update_teacher_profile
-- Updates an existing teacher's profile names only. The employment
-- classification is maintained separately by update_teacher_classification,
-- and is_active/linked_account_id are not writable through either function -
-- they are out of scope for profile maintenance.

CREATE OR REPLACE FUNCTION teachers.update_teacher_profile(
    p_teacher_id UUID,
    p_first_name TEXT,
    p_surname    TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE teachers.teachers
    SET first_name = p_first_name,
        surname    = p_surname
    WHERE teacher_id = p_teacher_id;
END;
$$;
