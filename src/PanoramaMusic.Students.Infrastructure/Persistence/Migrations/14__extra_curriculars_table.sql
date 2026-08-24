-- Create extra_curriculars table
-- An extra-curricular activity the school offers: a free-text description and
-- the phase it is offered to (#10).
-- phase mirrors the PhaseType enum in PanoramaMusic.Students.Domain.Enums
-- — keep in sync.
-- description is free text and carries no uniqueness constraint. #10's business
-- rules name only the practice-time rules, so no rule about repeated
-- descriptions has been settled either way — the identifier is what
-- distinguishes two activities today. Whether a description should be unique
-- within a phase is an open question on PR #279, not a decision recorded here.
-- Its length bound is the request validator's concern, not the table's.

CREATE TABLE IF NOT EXISTS students.extra_curriculars (
    extra_curricular_id UUID        NOT NULL PRIMARY KEY,
    description         TEXT        NOT NULL,
    phase               TEXT        NOT NULL CHECK (phase IN ('Junior', 'Senior')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
