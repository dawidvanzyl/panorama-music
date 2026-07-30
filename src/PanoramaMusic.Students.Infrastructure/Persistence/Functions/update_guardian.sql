CREATE OR REPLACE FUNCTION students.update_guardian(
    p_guardian_id              UUID,
    p_guardian_relationship_id UUID,
    p_first_name               TEXT,
    p_surname                  TEXT,
    p_cell                     TEXT,
    p_email                    TEXT,
    p_receives_correspondence  BOOLEAN,
    p_responsible_for_payment  BOOLEAN,
    p_married                  BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students.guardians
    SET guardian_relationship_id = p_guardian_relationship_id,
        first_name               = p_first_name,
        surname                  = p_surname,
        cell                     = p_cell,
        email                    = p_email,
        receives_correspondence  = p_receives_correspondence,
        responsible_for_payment  = p_responsible_for_payment,
        married                  = p_married
    WHERE guardian_id = p_guardian_id;
END;
$$;
