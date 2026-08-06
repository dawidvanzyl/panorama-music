-- Grant application role access to the teachers schema
-- The application connects as panorama_app (provisioned by
-- DatabaseMigrator.EnsureApplicationRole before migrators run) and needs full
-- DML on teachers tables. ALTER DEFAULT PRIVILEGES covers tables created by
-- future migrations, which run as the privileged migration role.

GRANT USAGE ON SCHEMA teachers TO panorama_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA teachers TO panorama_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA teachers
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO panorama_app;
