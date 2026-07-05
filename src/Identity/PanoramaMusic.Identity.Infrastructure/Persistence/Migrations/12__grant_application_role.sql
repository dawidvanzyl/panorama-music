-- Grant application role access to the identity schema
-- The application connects as panorama_app (provisioned by
-- DatabaseMigrator.EnsureApplicationRole before migrators run) and needs full
-- DML on identity tables. ALTER DEFAULT PRIVILEGES covers tables created by
-- future migrations, which run as the privileged migration role.

GRANT USAGE ON SCHEMA identity TO panorama_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO panorama_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA identity
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO panorama_app;
