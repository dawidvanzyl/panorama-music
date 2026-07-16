-- Add device/network/activity columns to refresh_tokens
-- Needed so a session can be displayed back to its owner (or an admin) with enough
-- detail to distinguish it from another session - device/browser, IP, and recency.

ALTER TABLE identity.refresh_tokens
    ADD COLUMN IF NOT EXISTS device_label TEXT,
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Existing rows predate activity tracking; approximate last activity as session start
-- rather than leaving it unset.
UPDATE identity.refresh_tokens
SET last_seen_at = session_started_at
WHERE last_seen_at IS NULL;

ALTER TABLE identity.refresh_tokens
    ALTER COLUMN last_seen_at SET NOT NULL;
