-- A course type and a lesson structure identify exactly one course. The use
-- case checks this before writing; the index settles two requests that both
-- pass that check.

CREATE UNIQUE INDEX IF NOT EXISTS ix_courses_course_type_lesson_structure
    ON students.courses (course_type, lesson_structure_id);
