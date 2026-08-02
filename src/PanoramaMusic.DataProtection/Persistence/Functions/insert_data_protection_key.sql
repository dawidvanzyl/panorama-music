-- insert_data_protection_key
-- Persists a single Data Protection key element. Called once per key
-- generation (key lifetime defaults to 90 days), not on every request.

CREATE OR REPLACE FUNCTION data_protection.insert_data_protection_key(
    p_id            UUID,
    p_friendly_name TEXT,
    p_key_xml       TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO data_protection.keys (id, friendly_name, key_xml)
    VALUES (p_id, p_friendly_name, p_key_xml);
END;
$$;
