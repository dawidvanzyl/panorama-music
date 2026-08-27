-- An activity's description is unique within its phase (#278, ruling R14).
-- A Junior "Choir" and a Senior "Choir" are legitimately different activities
-- and both stay allowed; a second Junior "Choir" is a typo far more often than a
-- real pair, and is refused.
-- The constraint rather than the application read is the arbiter: two requests
-- can both pass their read before either writes. ExtraCurricularRepository
-- translates the violation into the same refusal the read would have produced.
-- Migration 14 recorded that no such rule had been settled either way; it now
-- has been, which is why this arrives as its own migration rather than an edit
-- to that one.
-- No backfill: the feature is unreleased and no duplicate rows exist.

ALTER TABLE students.extra_curriculars
    ADD CONSTRAINT uq_extra_curriculars_description_phase UNIQUE (description, phase);
