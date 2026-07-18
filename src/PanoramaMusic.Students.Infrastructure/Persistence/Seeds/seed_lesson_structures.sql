-- Seed lesson structure combinations
-- Full LessonType x DurationType x OccurrenceType combination set (2x2x2).
-- Runs on every deploy (RunAlways); ON CONFLICT DO NOTHING keeps re-application
-- a no-op so re-seeding never creates duplicate rows.

INSERT INTO students.lesson_structures (lesson_structure_id, lesson_type, duration_type, occurrence_type)
VALUES
    ('e9ac58cc-d6a5-406e-b6a2-55076a0a3565', 'Individual', 'Hour', 'DuringSchool'),
    ('42e1c54f-aa5d-4dd0-ab1a-aced05dd3c54', 'Individual', 'Hour', 'AfterSchool'),
    ('0e6ecae2-b60a-483d-8abd-907a94e6a364', 'Individual', 'HalfHour', 'DuringSchool'),
    ('5c690f3a-ed87-4801-aa18-c1a2d3fba001', 'Individual', 'HalfHour', 'AfterSchool'),
    ('a208d954-2181-447f-af20-53ba2ca49ebf', 'Group', 'Hour', 'DuringSchool'),
    ('40312a7e-af5e-4629-a94e-455b852956f0', 'Group', 'Hour', 'AfterSchool'),
    ('805c3cfd-7d2e-4376-b93b-4b4e2547f5e8', 'Group', 'HalfHour', 'DuringSchool'),
    ('d786cc42-4176-437a-badb-8f0ae97bbdc9', 'Group', 'HalfHour', 'AfterSchool')
ON CONFLICT (lesson_type, duration_type, occurrence_type) DO NOTHING;
