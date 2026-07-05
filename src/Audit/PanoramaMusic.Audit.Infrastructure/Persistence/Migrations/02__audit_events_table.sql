-- Create audit_events table
-- Append-only record of security- and business-significant events across all
-- bounded contexts. event_type is a free-form namespaced string
-- ({context}.{entity}.{action}) — never a database enum — so new contexts can
-- introduce event types without a migration. target_id is null for create
-- events; the created record's id lives in the detail bag.

CREATE TABLE IF NOT EXISTS audit.audit_events (
    id             UUID PRIMARY KEY,
    occurred_at    TIMESTAMPTZ NOT NULL,
    event_type     TEXT NOT NULL,
    actor_id       UUID NULL,
    actor_email    TEXT NULL,
    target_id      UUID NULL,
    source_ip      TEXT NOT NULL,
    user_agent     TEXT NOT NULL,
    correlation_id UUID NOT NULL,
    outcome        TEXT NOT NULL,
    reason         TEXT NULL,
    detail         JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_audit_events_actor_email_occurred_at
    ON audit.audit_events (actor_email, occurred_at);

CREATE INDEX IF NOT EXISTS ix_audit_events_event_type_occurred_at
    ON audit.audit_events (event_type, occurred_at);
