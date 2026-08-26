-- Create student_extra_curriculars table
-- A student's participation in an extra-curricular activity (#10). The link
-- carries no attributes of its own, so the pair of student and activity is its
-- whole identity and stands as the primary key — there is no surrogate, and a
-- duplicate assignment is refused by that key rather than by a separate unique
-- constraint. Two requests can both pass the application's membership test
-- before either writes; the key is what actually settles it.
--
-- ON DELETE CASCADE on student_id: removing a student removes their assignments
-- with them, leaving no orphaned link. The activity reference is restricting by
-- default, so an activity cannot be dropped out from under an assignment.
--
-- The phase rule — a student takes part only in activities offered to their own
-- phase — is the StudentExtraCurricular aggregate's, not a CHECK here: it
-- compares two rows in different tables and can be corrected by editing either.

CREATE TABLE IF NOT EXISTS students.student_extra_curriculars (
    student_id          UUID        NOT NULL REFERENCES students.students(student_id) ON DELETE CASCADE,
    extra_curricular_id UUID        NOT NULL REFERENCES students.extra_curriculars(extra_curricular_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_student_extra_curriculars PRIMARY KEY (student_id, extra_curricular_id)
);

-- The primary key already backs an index led by student_id, which every read of
-- a student's activities uses. This one serves the other direction: how many
-- students an activity holds, which activity deletion will ask.
CREATE INDEX IF NOT EXISTS ix_student_extra_curriculars_extra_curricular_id
    ON students.student_extra_curriculars (extra_curricular_id);
