-- Create student_instruments table
-- The instrument type and step recorded against one enrollment, never against
-- the student globally — so the same student may hold a different instrument
-- and step on each course they are enrolled in. One row per enrollment at most:
-- a course type that records neither has no row here.
-- instrument_type/step_type mirror the InstrumentType/StepType enums in
-- PanoramaMusic.Students.Domain.Enums — keep in sync. instrument_type is
-- nullable because a theory course's enrollment records a step alone.

CREATE TABLE IF NOT EXISTS students.student_instruments (
    student_course_id UUID        NOT NULL PRIMARY KEY REFERENCES students.student_courses(student_course_id) ON DELETE CASCADE,
    instrument_type   TEXT        CHECK (instrument_type IN ('Piano', 'Guitar', 'Recorder', 'Keyboard', 'Voice', 'Other')),
    step_type         TEXT        NOT NULL CHECK (step_type IN ('Step1A', 'Step1B', 'Step2A', 'Step2B', 'Step3A', 'Step3B', 'Step4A', 'Step4B', 'Other')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
