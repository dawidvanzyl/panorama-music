-- create_saved_report
-- Inserts a new saved report. p_definition arrives as TEXT and is cast to
-- JSONB here because the text->jsonb cast is not implicit during
-- function-call parameter resolution.

CREATE OR REPLACE FUNCTION reporting.create_saved_report(
    p_saved_report_id UUID,
    p_name            TEXT,
    p_definition      TEXT,
    p_created_by      UUID,
    p_created_at      TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO reporting.saved_reports (saved_report_id, name, definition, created_by, created_at, last_run_at)
    VALUES (p_saved_report_id, p_name, p_definition::jsonb, p_created_by, p_created_at, NULL);
END;
$$;
