-- Enable partial (ILIKE '%...%') matching on actor_email to use an index
-- instead of falling back to a sequential scan, since a leading wildcard
-- cannot use the existing plain btree index on that column.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS ix_audit_events_actor_email_trgm
    ON audit.audit_events USING gin (actor_email gin_trgm_ops);
