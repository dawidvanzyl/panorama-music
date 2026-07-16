-- Grant application role access to audit_events
-- The application role (provisioned by DatabaseMigrator.EnsureApplicationRole
-- before any context migrator runs) receives INSERT and SELECT only — UPDATE
-- and DELETE are explicitly withheld so audit_events is append-only at the
-- database grant level.

GRANT USAGE ON SCHEMA audit TO panorama_app;

GRANT INSERT, SELECT ON audit.audit_events TO panorama_app;

REVOKE UPDATE, DELETE ON audit.audit_events FROM panorama_app;
