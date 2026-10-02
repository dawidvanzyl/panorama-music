-- update_saved_report
-- Replaces the name and definition of an existing saved report. Nothing
-- else about the row changes.

CREATE OR REPLACE FUNCTION reporting.update_saved_report(
    p_saved_report_id UUID,
    p_name            TEXT,
    p_definition      TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE reporting.saved_reports
    SET name = p_name,
        definition = p_definition::jsonb
    WHERE saved_report_id = p_saved_report_id;
END;
$$;
