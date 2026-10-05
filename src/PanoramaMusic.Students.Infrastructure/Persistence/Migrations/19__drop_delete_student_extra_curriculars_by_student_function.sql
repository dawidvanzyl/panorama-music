-- The grade changing to Private no longer deletes a student's assignments, so
-- the bulk delete has no caller. Functions deploy as RunAlways scripts, so removing
-- the file alone would leave it on already-migrated databases; the drop has to
-- happen via a versioned migration.

DROP FUNCTION IF EXISTS students.delete_student_extra_curriculars_by_student(UUID);
