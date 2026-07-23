-- Allow class/phase to be absent for Private-grade students
-- A Private-grade student (private-lesson-only, outside the standard
-- grade/class/phase classification) must not carry a class or phase, while
-- every other grade continues to require both. The existing CHECK
-- constraints already permit NULL (a NULL operand makes `IN (...)`
-- evaluate to NULL, which PostgreSQL treats as satisfying the check), so
-- only the NOT NULL constraints need to be relaxed.

ALTER TABLE students.students
    ALTER COLUMN class DROP NOT NULL,
    ALTER COLUMN phase DROP NOT NULL;
