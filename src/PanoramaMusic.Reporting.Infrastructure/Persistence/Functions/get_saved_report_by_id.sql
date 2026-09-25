-- get_saved_report_by_id
-- Returns a single saved report row, with its creator's email, or no rows if
-- not found.

CREATE OR REPLACE FUNCTION reporting.get_saved_report_by_id(
    p_saved_report_id UUID
)
RETURNS TABLE(
    saved_report_id UUID,
    name            TEXT,
    definition      TEXT,
    created_by      UUID,
    creator_email   TEXT,
    created_at      TIMESTAMPTZ,
    last_run_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT r.saved_report_id, r.name, r.definition::text, r.created_by, u.email, r.created_at, r.last_run_at
    FROM reporting.saved_reports r
    LEFT JOIN identity.users u ON u.user_id = r.created_by
    WHERE r.saved_report_id = p_saved_report_id;
END;
$$;
