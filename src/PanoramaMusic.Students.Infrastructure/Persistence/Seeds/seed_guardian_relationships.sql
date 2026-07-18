-- Seed guardian relationship types
-- Runs on every deploy (RunAlways); ON CONFLICT DO NOTHING keeps re-application
-- a no-op so re-seeding never creates duplicate rows.

INSERT INTO students.guardian_relationships (guardian_relationship_id, name)
VALUES
    ('dee46e4d-22d7-4581-b103-5b9c3fd31a1b', 'Mother'),
    ('e7cdd671-b118-49b3-bb39-beaac8124ab1', 'Father'),
    ('602402bf-f2c1-4d82-895c-67aa6f19a572', 'Stepmother'),
    ('822eb894-c113-418b-9c56-c2dd0904e957', 'Stepfather'),
    ('e80f6684-c0fd-4d28-98e5-8bd71e49384b', 'Grandmother'),
    ('75a101d6-979a-4a46-a65f-ffdac7053ccf', 'Grandfather'),
    ('8f5bc209-3dbe-4ccc-be79-4e8e4d4a82fe', 'Legal Guardian'),
    ('614be504-6531-4f68-844c-119928cc3fdd', 'Other')
ON CONFLICT (name) DO NOTHING;
