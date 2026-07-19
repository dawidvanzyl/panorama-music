-- Create students table
-- grade/class/phase/language mirror the GradeType/ClassType/PhaseType/Language
-- enums in PanoramaMusic.Students.Domain.Enums — keep in sync.

CREATE TABLE IF NOT EXISTS students.students (
    student_id     UUID        NOT NULL PRIMARY KEY,
    first_name     TEXT        NOT NULL,
    last_name      TEXT        NOT NULL,
    date_of_birth  DATE        NOT NULL,
    grade          TEXT        NOT NULL CHECK (grade IN ('Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5', 'Grade6', 'Grade7', 'Private')),
    class          TEXT        NOT NULL CHECK (class IN ('A1', 'A2', 'E1', 'E2', 'E3', 'E4')),
    phase          TEXT        NOT NULL CHECK (phase IN ('Junior', 'Senior')),
    language       TEXT        NOT NULL CHECK (language IN ('Afrikaans', 'English')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
