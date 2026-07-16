-- Add session-lifecycle columns to refresh_tokens
-- family_id groups all tokens descended from the same login via rotation, enabling
-- reuse-detection (revoke the whole family when a stale token is replayed) and an
-- absolute session lifetime measured from session_started_at, independent of rotation.

ALTER TABLE identity.refresh_tokens
    ADD COLUMN IF NOT EXISTS family_id UUID,
    ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ;

UPDATE identity.refresh_tokens
SET family_id = token_id
WHERE family_id IS NULL;

-- Existing rows predate session tracking; approximate the session start from the
-- refresh token's fixed 7-day expiry window rather than leaving it unset.
UPDATE identity.refresh_tokens
SET session_started_at = expires_at - INTERVAL '7 days'
WHERE session_started_at IS NULL;

ALTER TABLE identity.refresh_tokens
    ALTER COLUMN family_id SET NOT NULL,
    ALTER COLUMN session_started_at SET NOT NULL;
