-- created_by has no foreign key to identity.users: the creator is fixed
-- forever and shows as '(removed)' once the account behind it is gone.

CREATE TABLE IF NOT EXISTS reporting.saved_reports (
    saved_report_id UUID        NOT NULL PRIMARY KEY,
    name            TEXT        NOT NULL,
    definition      JSONB       NOT NULL,
    created_by      UUID        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    last_run_at     TIMESTAMPTZ NULL
);
