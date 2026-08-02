-- get_data_protection_keys
-- Returns every persisted key element, read by the framework each time it
-- constructs a new key ring (e.g. on process startup). Only the XML payload
-- is projected — IXmlRepository.GetAllElements returns bare XElements, so the
-- friendly name is never read back.

CREATE OR REPLACE FUNCTION data_protection.get_data_protection_keys()
RETURNS TABLE(
    key_xml TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT k.key_xml
    FROM data_protection.keys k;
END;
$$;
