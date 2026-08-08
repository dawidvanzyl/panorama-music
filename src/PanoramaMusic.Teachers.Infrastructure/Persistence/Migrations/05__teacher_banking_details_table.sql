-- Create teacher banking details table
-- The most sensitive data the application holds, so its shape is deliberate:
-- teacher_id is the primary key, which is what enforces "a teacher has at most
-- one set of banking details" — there is no separate surrogate key to permit a
-- second row. ON DELETE CASCADE ties the record's lifetime to the teacher's;
-- the audit trail outlives it and is what survives the deletion.
-- account_number_protected holds the ASP.NET Data Protection payload and is
-- never readable as plaintext. The key identifier travels inside that payload,
-- so no key column sits beside it.
-- account_number_last4 is the only part of the number held in the clear. It
-- exists so masked display and list rendering never require an unprotect,
-- which is also why the protected column is neither indexed nor searchable —
-- accepted, since nothing sorts or filters on an account number.

CREATE TABLE IF NOT EXISTS teachers.banking_details (
    teacher_id               UUID        NOT NULL PRIMARY KEY
                                         REFERENCES teachers.teachers (teacher_id) ON DELETE CASCADE,
    bank                     TEXT        NOT NULL,
    account_type             TEXT        NOT NULL,
    branch_code              TEXT        NOT NULL,
    account_number_protected TEXT        NOT NULL,
    account_number_last4     TEXT        NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
