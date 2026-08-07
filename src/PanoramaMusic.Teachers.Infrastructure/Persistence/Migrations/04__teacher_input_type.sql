-- teachers.teacher_input composite type
-- Bundles the writable fields of a teacher as a single table-valued
-- parameter for create_teacher, mirroring students.student_input.
-- linked_account_id is carried here because an account may be chosen while the
-- teacher is being created, not only afterwards.

CREATE TYPE teachers.teacher_input AS (
    first_name          TEXT,
    surname             TEXT,
    is_private          BOOLEAN,
    linked_account_id   UUID
);
