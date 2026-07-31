-- Enforce relationship-type name uniqueness case-insensitively.
-- The table's original UNIQUE constraint is case-sensitive, so it would accept
-- "mother" alongside "Mother" — while the maintenance endpoints reject that
-- (get_guardian_relationship_by_name matches on LOWER(name)). This index moves
-- the database to the same rule, closing the gap where two concurrent creates
-- could both pass the application check and both insert.

CREATE UNIQUE INDEX IF NOT EXISTS ix_guardian_relationships_name_lower
    ON students.guardian_relationships (LOWER(name));
