import type { Course, CourseType, DurationType, LessonStructure, LessonType, OccurrenceType } from './courses';

/**
 * How course values are named and shown. The server returns enum members only,
 * so the wording the design specifies lives here, in one place, rather than
 * being spelled out in each component that renders it.
 */

export const COURSE_TYPES: CourseType[] = ['Theory', 'GREEnrichment', 'G1Enrichment', 'G2Recorder', 'Instrument'];
export const LESSON_TYPES: LessonType[] = ['Individual', 'Group'];
export const DURATION_TYPES: DurationType[] = ['Hour', 'HalfHour'];
export const OCCURRENCE_TYPES: OccurrenceType[] = ['DuringSchool', 'AfterSchool'];

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

/** What the lesson structure dropdown offers: all three dimensions of the structure. */
export function lessonStructureOptionLabel(structure: LessonStructure): string {
  return [
    LESSON_TYPE_LABELS[structure.lessonType],
    DURATION_TYPE_LABELS[structure.durationType],
    OCCURRENCE_TYPE_LABELS[structure.occurrenceType],
  ].join(' · ');
}

/** The table's Lesson Structure column; occurrence has a column of its own. */
export function lessonStructureColumnText(course: Course): string {
  return `${LESSON_TYPE_LABELS[course.lessonType]} · ${DURATION_TYPE_LABELS[course.durationType]}`;
}

export function costText(cost: number): string {
  return `R ${cost.toFixed(2)}`;
}

export function resultSummaryText(shown: number, total: number): string {
  return `${shown} of ${total} courses`;
}
