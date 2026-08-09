-- get_target_activity
-- Returns every audit event recorded against one target, narrowed to a given
-- set of event types. Deliberately generic: the Audit context has no idea what
-- a teacher or a banking detail is, so the caller names the types it cares
-- about and this function stays reusable for the next context that needs an
-- activity view over one record.
-- Unpaged by design — an activity view for a single record is bounded by that
-- record's own history, unlike the global audit log get_audit_events serves.
-- Ordering matches that function's: newest first, with id as a stable
-- tiebreaker for rows sharing an occurred_at.
--
-- total_count is returned for the same reason get_audit_events returns it, and
-- so both functions project the same row shape onto the one audit row DTO and
-- its one mapper. Unpaged, it is simply the number of rows returned.

CREATE OR REPLACE FUNCTION audit.get_target_activity(
    p_target_id   UUID,
    p_event_types TEXT[]
)
RETURNS TABLE(
    id             UUID,
    occurred_at    TIMESTAMPTZ,
    event_type     TEXT,
    actor_id       UUID,
    actor_email    TEXT,
    target_id      UUID,
    source_ip      TEXT,
    user_agent     TEXT,
    correlation_id UUID,
    outcome        TEXT,
    reason         TEXT,
    detail         JSONB,
    total_count    BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.occurred_at,
        e.event_type,
        e.actor_id,
        e.actor_email,
        e.target_id,
        e.source_ip,
        e.user_agent,
        e.correlation_id,
        e.outcome,
        e.reason,
        e.detail,
        COUNT(*) OVER() AS total_count
    FROM audit.audit_events e
    WHERE e.target_id = p_target_id
      AND e.event_type = ANY (p_event_types)
    ORDER BY e.occurred_at DESC, e.id DESC;
END;
$$;
