-- get_audit_events
-- Returns a filtered, paged slice of audit.audit_events plus the total
-- matching row count in a single call (COUNT(*) OVER()), avoiding a
-- separate count query. actor_email is a partial, case-insensitive match
-- against the denormalized top-level column; event_type is an exact match.
-- Any filter parameter left NULL is not applied. Ordering includes id as a
-- stable tiebreaker so rows sharing an identical occurred_at (realistic —
-- e.g. a single admin action can write more than one audit row) are never
-- duplicated or skipped across a page boundary.
--
-- p_to is a precise, already-resolved inclusive upper bound: the Application
-- layer (AuditToDateResolver) decides whether the caller's raw "to" string
-- named a whole day or a precise instant, using the original string — a
-- distinction that's lost by the time a value reaches this function. This
-- function only ever sees the resolved instant, so a plain comparison here
-- is correct in both cases.

CREATE OR REPLACE FUNCTION audit.get_audit_events(
    p_actor_email TEXT,
    p_event_type  TEXT,
    p_from        TIMESTAMPTZ,
    p_to          TIMESTAMPTZ,
    p_page        INT,
    p_page_size   INT
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

    WHERE
        (p_actor_email IS NULL OR e.actor_email ILIKE '%' || p_actor_email || '%')
        AND (p_event_type IS NULL OR e.event_type = p_event_type)
        AND (p_from IS NULL OR e.occurred_at >= p_from)
        AND (p_to IS NULL OR e.occurred_at <= p_to)

    ORDER BY e.occurred_at DESC, e.id DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$;
