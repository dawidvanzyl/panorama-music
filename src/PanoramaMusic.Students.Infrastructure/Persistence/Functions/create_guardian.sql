CREATE OR REPLACE FUNCTION students.create_guardian(
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
    INSERT INTO students.guardians (
        guardian_id, guardian_relationship_id, first_name, surname, cell, email,
        receives_correspondence, responsible_for_payment, married
    )
    VALUES (
        p_guardian_id, p_guardian_relationship_id, p_first_name, p_surname, p_cell, p_email,
        p_receives_correspondence, p_responsible_for_payment, p_married
    );
END;
$$;
