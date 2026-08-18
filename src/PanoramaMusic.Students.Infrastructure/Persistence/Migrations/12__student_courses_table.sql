-- Create student_courses table
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
