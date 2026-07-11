-- Track the access token issued alongside each refresh-token row.
-- Needed so revoking a session can also denylist its currently-issued access token
-- (via identity.revoked_access_tokens), instead of only blocking future refreshes.

ALTER TABLE identity.refresh_tokens
    ADD COLUMN IF NOT EXISTS access_token_jti UUID,
    ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;
