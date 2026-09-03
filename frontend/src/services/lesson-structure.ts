/**
 * The lesson-structure vocabulary shared across the Courses and Students
 * features: course type, the three dimensions of a lesson structure, and the
 * instrument a student may take up — together with how each is spelled for a
 * human. A label is how an enum member reads to a person, and splitting it
 * from its union is what lets the two features' wording drift; the whole
 * pair moves together. Both `features/courses` and `features/students` are
 * self-contained today, and neither imports the other — this module is the
 * one shared home for the vocabulary both need, declared once here rather
 * than duplicated per feature (ruling R5, widened to labels by ruling R6).
 */

export type CourseType = 'Theory' | 'GREEnrichment' | 'G1Enrichment' | 'G2Recorder' | 'Instrument';
export type LessonType = 'Individual' | 'Group';
export type DurationType = 'Hour' | 'HalfHour';
export type OccurrenceType = 'DuringSchool' | 'AfterSchool';
export type InstrumentType = 'Piano' | 'Guitar' | 'Recorder' | 'Keyboard' | 'Voice' | 'Other';

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  Theory: 'Theory',
  GREEnrichment: 'GR Enrichment',
  G1Enrichment: 'Grade 1 Enrichment',
  G2Recorder: 'Grade 2 Recorder',
  Instrument: 'Instrument',
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  Individual: 'Individual',
  Group: 'Group',
};

export const DURATION_TYPE_LABELS: Record<DurationType, string> = {
  Hour: 'Hour',
  HalfHour: 'Half Hour',
};

export const OCCURRENCE_TYPE_LABELS: Record<OccurrenceType, string> = {
  DuringSchool: 'During School',
  AfterSchool: 'After School',
};

export const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  Piano: 'Piano',
  Guitar: 'Guitar',
  Recorder: 'Recorder',
  Keyboard: 'Keyboard',
  Voice: 'Voice',
  Other: 'Other',
};
