-- Create courses table
-- A course the school offers: a course type, a price, and the seeded lesson
-- structure it is delivered under (#8).
-- course_type mirrors the CourseType enum in PanoramaMusic.Students.Domain.Enums
-- — keep in sync.
-- cost is NUMERIC so a monetary amount never round-trips through a
-- floating-point type; the two-decimal scale is the stored precision. Its range
-- is the request validator's concern, not the table's.

CREATE TABLE IF NOT EXISTS students.courses (
    course_id           UUID          NOT NULL PRIMARY KEY,
    course_type         TEXT          NOT NULL CHECK (course_type IN ('Theory', 'GREEnrichment', 'G1Enrichment', 'G2Recorder', 'Instrument')),
    cost                NUMERIC(10, 2) NOT NULL,
    lesson_structure_id UUID          NOT NULL REFERENCES students.lesson_structures(lesson_structure_id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_courses_lesson_structure_id
    ON students.courses (lesson_structure_id);
