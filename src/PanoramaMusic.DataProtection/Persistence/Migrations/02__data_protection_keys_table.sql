-- Create data_protection.keys table
-- Persists the ASP.NET Core Data Protection keyring outside the container
-- filesystem, so protected payloads (e.g. encrypted banking details) remain
-- decryptable across restarts, redeploys and Render's free-tier spin-downs.
-- friendly_name matches IXmlRepository.StoreElement's identifier for the key
-- element; key_xml holds the full serialized <key> element, whose payload is
-- itself encrypted when certificate protection is configured. No key
-- identifier column is needed — the framework embeds it in the XML payload.
-- The column is key_xml rather than xml so it never collides with the
-- built-in xml type name in function signatures.
-- id is generated application-side (no gen_random_uuid()/pgcrypto dependency),
-- matching the convention used by audit.audit_events.

CREATE TABLE IF NOT EXISTS data_protection.keys (
    id            UUID PRIMARY KEY,
    friendly_name TEXT NOT NULL,
    key_xml       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
