-- get_teachers_by_ids
-- The named teachers only, in one call. Exists so naming the teachers a set of
-- enrollments assigns costs one query that scales with the ids asked about,
-- rather than a read of the whole roster narrowed afterwards — the same shape
-- as get_teacher_banking_details_by_ids.
-- The linked account is returned as an id only, as get_teachers does; naming it
-- is Identity's to answer.

CREATE OR REPLACE FUNCTION teachers.get_teachers_by_ids(
    p_teacher_ids UUID[]
)
RETURNS TABLE(
    teacher_id          UUID,
    first_name          TEXT,
    surname             TEXT,
    is_private          BOOLEAN,
    is_active           BOOLEAN,
    linked_account_id   UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.teacher_id, t.first_name, t.surname, t.is_private, t.is_active, t.linked_account_id
    FROM teachers.teachers t
    WHERE t.teacher_id = ANY (p_teacher_ids)
    ORDER BY t.surname, t.first_name;
END;
$$;
