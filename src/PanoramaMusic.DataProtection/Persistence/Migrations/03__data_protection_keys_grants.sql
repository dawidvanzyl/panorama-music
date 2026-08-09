-- Grant application role access to data_protection.keys
-- The application role needs full read/write access: the framework both
-- writes new key elements (first protect against an empty store) and reads
-- the full keyring on every provider construction.

GRANT USAGE ON SCHEMA data_protection TO panorama_app;

GRANT INSERT, SELECT ON data_protection.keys TO panorama_app;
