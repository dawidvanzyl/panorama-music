-- Create teachers table
-- is_private mirrors the Teacher.IsPrivate flag in
-- PanoramaMusic.Teachers.Domain.Entities — true means the teacher is paid
-- directly by parents, false means paid by the school. It is informational
-- only and must never gate any other behaviour.
-- linked_account_id points at the login account the teacher maintains their
-- own record through. ON DELETE SET NULL is what unlinks a teacher when its
-- account is deleted: the link clears and the teacher row survives, so the
-- Identity context never needs application code that knows what a teacher is.
-- The partial unique index enforces the other half of the one-to-one rule — an
-- account may back at most one teacher — while still allowing any number of
-- teachers to have no account at all.

CREATE TABLE IF NOT EXISTS teachers.teachers (
    teacher_id          UUID        NOT NULL PRIMARY KEY,
    first_name          TEXT        NOT NULL,
    surname             TEXT        NOT NULL,
    is_private          BOOLEAN     NOT NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    linked_account_id   UUID        REFERENCES identity.users (user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS teachers_linked_account_id_key
    ON teachers.teachers (linked_account_id)
    WHERE linked_account_id IS NOT NULL;
