-- Create teachers table
-- is_private mirrors the Teacher.IsPrivate flag in
-- PanoramaMusic.Teachers.Domain.Entities — true means the teacher is paid
-- directly by parents, false means paid by the school. It is informational
-- only and must never gate any other behaviour.
-- linked_account_id is reserved for a future story (account linking) and
-- carries no linking logic yet.

CREATE TABLE IF NOT EXISTS teachers.teachers (
    teacher_id          UUID        NOT NULL PRIMARY KEY,
    first_name          TEXT        NOT NULL,
    surname             TEXT        NOT NULL,
    is_private          BOOLEAN     NOT NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    linked_account_id   UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
