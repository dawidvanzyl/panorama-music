-- Create extra_curriculars table
-- An extra-curricular activity the school offers: a free-text description and
-- the phase it is offered to (#10).
-- phase mirrors the PhaseType enum in PanoramaMusic.Students.Domain.Enums
-- — keep in sync.
-- description is free text and deliberately not unique: two activities may share
-- a name, and the identifier is what distinguishes them. Its length bound is the
-- request validator's concern, not the table's.

CREATE TABLE IF NOT EXISTS students.extra_curriculars (
    extra_curricular_id UUID        NOT NULL PRIMARY KEY,
    description         TEXT        NOT NULL,
    phase               TEXT        NOT NULL CHECK (phase IN ('Junior', 'Senior')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
