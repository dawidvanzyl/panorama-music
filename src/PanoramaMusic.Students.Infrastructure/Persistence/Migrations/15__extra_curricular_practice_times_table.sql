-- Create extra_curricular_practice_times table
-- One weekly practice slot belonging to an extra-curricular activity (#10).
-- day mirrors the DayType enum in PanoramaMusic.Students.Domain.Enums — keep in
-- sync. The enum's member order is the display order; this column stores the
-- name, and ordering is the aggregate's concern rather than the query's.
-- start_time is TIME, not TIMESTAMP: a slot recurs every week and has no date
-- component to record.
-- The slots are owned by their activity, so the cascade is what makes "a
-- practice time cannot exist without its activity" true in the schema.
-- The day-and-time pair is unique within one activity only — two different
-- activities may share a day and start time.

CREATE TABLE IF NOT EXISTS students.extra_curricular_practice_times (
    practice_time_id    UUID        NOT NULL PRIMARY KEY,
    extra_curricular_id UUID        NOT NULL REFERENCES students.extra_curriculars(extra_curricular_id) ON DELETE CASCADE,
    day                 TEXT        NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time          TIME        NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_extra_curricular_practice_times_slot UNIQUE (extra_curricular_id, day, start_time)
);

-- No separate index on extra_curricular_id: the unique constraint above already
-- backs one whose leading column it is, which the listing join uses.
