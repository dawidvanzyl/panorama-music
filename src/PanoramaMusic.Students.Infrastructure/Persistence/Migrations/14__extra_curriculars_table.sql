-- Create extra_curriculars table
-- An extra-curricular activity the school offers: a free-text description and
-- the phase it is offered to (#10).
-- phase mirrors the PhaseType enum in PanoramaMusic.Students.Domain.Enums
-- — keep in sync.
-- A description is unique within its phase (#278). A Junior "Choir"
-- and a Senior "Choir" are legitimately different activities and both stay
-- allowed; a second Junior "Choir" is a typo far more often than a real pair,
-- and is refused. The constraint rather than the application read is the
-- arbiter: two requests can both pass their read before either writes, and
-- ExtraCurricularRepository translates the violation into the same refusal the
-- read would have produced.
-- The description's length bound is the request validator's concern, not the
-- table's.

CREATE TABLE IF NOT EXISTS students.extra_curriculars (
    extra_curricular_id UUID        NOT NULL PRIMARY KEY,
    description         TEXT        NOT NULL,
    phase               TEXT        NOT NULL CHECK (phase IN ('Junior', 'Senior')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_extra_curriculars_description_phase UNIQUE (description, phase)
);
