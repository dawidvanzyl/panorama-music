-- Grant application role access to the students schema
-- The application connects as panorama_app (provisioned by
-- DatabaseMigrator.EnsureApplicationRole before migrators run) and needs full
-- DML on students tables. ALTER DEFAULT PRIVILEGES covers tables created by
-- future migrations, which run as the privileged migration role.

GRANT USAGE ON SCHEMA students TO panorama_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA students TO panorama_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA students
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO panorama_app;
