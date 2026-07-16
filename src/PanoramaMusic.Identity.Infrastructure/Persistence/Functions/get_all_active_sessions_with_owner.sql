-- get_all_active_sessions_with_owner
-- Returns every non-revoked, non-expired refresh token across all users, joined with the
-- owning user's email and roles in a single query - avoids N+1 owner/role lookups when
-- building the admin-facing global session list.

DROP FUNCTION IF EXISTS identity.get_all_active_sessions_with_owner();

CREATE OR REPLACE FUNCTION identity.get_all_active_sessions_with_owner()
RETURNS TABLE(
    token_id           UUID,
    user_id            UUID,
    user_email         TEXT,
    user_roles         TEXT,
    session_started_at TIMESTAMPTZ,
    last_seen_at       TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ,
    device_label       TEXT,
    ip_address         TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.token_id,
        rt.user_id,
        u.email,
        COALESCE(STRING_AGG(ur.role, ',') FILTER (WHERE ur.role IS NOT NULL), ''),
        rt.session_started_at,
        rt.last_seen_at,
        rt.expires_at,
        rt.device_label,
        rt.ip_address
    FROM identity.refresh_tokens rt
    JOIN identity.users u ON u.user_id = rt.user_id
    LEFT JOIN identity.user_roles ur ON ur.user_id = rt.user_id
    WHERE rt.revoked_at IS NULL
      AND rt.expires_at > NOW()
    GROUP BY rt.token_id, rt.user_id, u.email, rt.session_started_at, rt.last_seen_at, rt.expires_at, rt.device_label, rt.ip_address
    ORDER BY rt.last_seen_at DESC;
END;
$$;
