-- create_audit_event
-- Inserts a single audit event into audit.audit_events. p_detail arrives as
-- TEXT and is cast to JSONB here because the text→jsonb cast is not implicit
-- during function-call parameter resolution.

CREATE OR REPLACE FUNCTION audit.create_audit_event(
    p_id             UUID,
    p_occurred_at    TIMESTAMPTZ,
    p_event_type     TEXT,
    p_actor_id       UUID,
    p_actor_email    TEXT,
    p_target_id      UUID,
    p_source_ip      TEXT,
    p_user_agent     TEXT,
    p_correlation_id UUID,
    p_outcome        TEXT,
    p_reason         TEXT,
    p_detail         TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit.audit_events (
        id,
        occurred_at,
        event_type,
        actor_id,
        actor_email,
        target_id,
        source_ip,
        user_agent,
        correlation_id,
        outcome,
        reason,
        detail
    )
    VALUES (
        p_id,
        p_occurred_at,
        p_event_type,
        p_actor_id,
        p_actor_email,
        p_target_id,
        p_source_ip,
        p_user_agent,
        p_correlation_id,
        p_outcome,
        p_reason,
        p_detail::jsonb
    );
END;
$$;
