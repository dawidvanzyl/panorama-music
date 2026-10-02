-- delete_saved_report_by_id
-- Permanently removes a saved report.

CREATE OR REPLACE FUNCTION reporting.delete_saved_report_by_id(
    p_saved_report_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM reporting.saved_reports
    WHERE saved_report_id = p_saved_report_id;
END;
$$;
