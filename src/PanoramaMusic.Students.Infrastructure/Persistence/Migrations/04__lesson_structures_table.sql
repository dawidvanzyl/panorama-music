-- Create lesson_structures table
-- Seeded lookup of valid LessonType/DurationType/OccurrenceType combinations,
-- referenced by Courses & Structures (#8).
-- lesson_type/duration_type/occurrence_type mirror the LessonType/DurationType/
-- OccurrenceType enums in PanoramaMusic.Students.Domain.Enums — keep in sync.

CREATE TABLE IF NOT EXISTS students.lesson_structures (
    lesson_structure_id UUID        NOT NULL PRIMARY KEY,
    lesson_type         TEXT        NOT NULL CHECK (lesson_type IN ('Individual', 'Group')),
    duration_type       TEXT        NOT NULL CHECK (duration_type IN ('Hour', 'HalfHour')),
    occurrence_type     TEXT        NOT NULL CHECK (occurrence_type IN ('DuringSchool', 'AfterSchool')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_type, duration_type, occurrence_type)
);
