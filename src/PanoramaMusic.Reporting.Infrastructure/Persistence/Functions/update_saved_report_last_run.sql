-- update_saved_report_last_run
-- Records the time of a run. Nothing else about the report changes.

CREATE OR REPLACE FUNCTION reporting.update_saved_report_last_run(
    p_saved_report_id UUID,
    p_last_run_at     TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE reporting.saved_reports
    SET last_run_at = p_last_run_at
    WHERE saved_report_id = p_saved_report_id;
END;
$$;
