/**
 * The lesson-structure vocabulary shared across the Courses and Students
 * features: course type, the three dimensions of a lesson structure, and the
 * instrument a student may take up. Both `features/courses` and
 * `features/students` are self-contained today, and neither imports the
 * other — this module is the one shared home for the types both need,
 * declared once here rather than duplicated per feature (ruling R5).
 */

export type CourseType = 'Theory' | 'GREEnrichment' | 'G1Enrichment' | 'G2Recorder' | 'Instrument';
export type LessonType = 'Individual' | 'Group';
export type DurationType = 'Hour' | 'HalfHour';
export type OccurrenceType = 'DuringSchool' | 'AfterSchool';
export type InstrumentType = 'Piano' | 'Guitar' | 'Recorder' | 'Keyboard' | 'Voice' | 'Other';
