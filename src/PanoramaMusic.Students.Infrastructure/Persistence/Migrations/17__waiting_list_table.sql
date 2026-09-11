-- Create waiting_list table
-- A student's place on the waiting list (#292). A student holds at most one
-- entry — the unique constraint on student_id is what actually settles that
-- against a race, the same way the (student_id, course_id) constraint on
-- student_courses settles a duplicate enrollment.
--
-- lesson_structure_id references the same seeded lookup Courses is built from,
-- and the entry holds no course reference of its own — which course a student
-- ends up in is settled at enrolment, a later story's concern.
--
-- ON DELETE CASCADE on student_id: removing a student removes their waiting-
-- list entry with them. The lesson structure reference is restricting by
-- default, so a structure cannot be dropped out from under an entry.
--
-- added_at is a date-time, not a date: two entries added on the same day must
-- still order deterministically, and queue position is derived from this
-- column rather than stored.

CREATE TABLE IF NOT EXISTS students.waiting_list (
    waiting_list_entry_id UUID        NOT NULL PRIMARY KEY,
    student_id             UUID        NOT NULL REFERENCES students.students(student_id) ON DELETE CASCADE,
    lesson_structure_id    UUID        NOT NULL REFERENCES students.lesson_structures(lesson_structure_id),
    instrument_type        TEXT        NOT NULL,
    notes                  TEXT        NULL,
    added_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_waiting_list_student UNIQUE (student_id)
);

-- Every read of the list is grouped by occurrence type and ordered by
-- added_at, which the lesson structure join reaches through this index.
CREATE INDEX IF NOT EXISTS ix_waiting_list_lesson_structure_id
    ON students.waiting_list (lesson_structure_id);
