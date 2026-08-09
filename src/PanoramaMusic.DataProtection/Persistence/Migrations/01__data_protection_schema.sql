-- Create data_protection schema
-- Establishes the bounded-context schema for the Data Protection keyring
-- store. This project belongs to no bounded context, but schema objects
-- still travel with the project that owns them rather than the default
-- schema.

CREATE SCHEMA IF NOT EXISTS data_protection;
