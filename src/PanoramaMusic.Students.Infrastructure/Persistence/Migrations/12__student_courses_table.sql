-- Create student_courses and student_instruments tables
-- A student's enrollment in a course, with exactly one assigned teacher and the
-- date they were enrolled (#9). ON DELETE CASCADE on student_id: removing a
-- student removes their enrollments with them. The course reference is
-- restricting by default, so a course cannot be dropped out from under an
-- enrollment.
--
-- teacher_id carries no foreign key: teachers live in another bounded context's
-- schema, and that a teacher exists is answered through the Students context's
-- own teacher-directory port rather than by this schema.
--
-- The (student_id, course_id) unique constraint is what actually settles a
-- duplicate enrollment — two requests can both pass the application's read
-- before either writes.

CREATE TABLE IF NOT EXISTS students.student_courses (
    student_course_id UUID        NOT NULL PRIMARY KEY,
    student_id        UUID        NOT NULL REFERENCES students.students(student_id) ON DELETE CASCADE,
    course_id         UUID        NOT NULL REFERENCES students.courses(course_id),
    teacher_id        UUID        NOT NULL,
    enrolled_date     DATE        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_courses_student_course UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS ix_student_courses_course_id
    ON students.student_courses (course_id);

CREATE INDEX IF NOT EXISTS ix_student_courses_teacher_id
    ON students.student_courses (teacher_id);

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
