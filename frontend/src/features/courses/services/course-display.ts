import type { Course, CourseType, DurationType, LessonStructure, LessonType, OccurrenceType } from './courses';
import {
  COURSE_TYPE_LABELS,
  LESSON_TYPE_LABELS,
  DURATION_TYPE_LABELS,
  OCCURRENCE_TYPE_LABELS,
} from '../../../services/lesson-structure';

/**
 * How course values are named and shown. The server returns enum members only,
 * so the wording the design specifies lives here, in one place, rather than
 * being spelled out in each component that renders it.
 */

export const COURSE_TYPES: CourseType[] = ['Theory', 'GREEnrichment', 'G1Enrichment', 'G2Recorder', 'Instrument'];
export const LESSON_TYPES: LessonType[] = ['Individual', 'Group'];
export const DURATION_TYPES: DurationType[] = ['Hour', 'HalfHour'];
export const OCCURRENCE_TYPES: OccurrenceType[] = ['DuringSchool', 'AfterSchool'];

// Shared with the Students feature via services/lesson-structure.ts (ruling
// R6) — re-exported here so existing imports from this module keep working.
export { COURSE_TYPE_LABELS, LESSON_TYPE_LABELS, DURATION_TYPE_LABELS, OCCURRENCE_TYPE_LABELS };

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

/**
 * Cost arrives as the server's exact decimal text and is padded to two places
 * as text — never through `Number`, which would make it a double.
 */
export function costText(cost: string): string {
  const [whole, fraction = ''] = cost.split('.');
  return `R ${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

const COST_PATTERN = /^\d+(\.\d{1,2})?$/;

export const COST_ERROR = 'Cost must be an amount with at most two decimals.';

/**
 * Whether the entered text is an amount the server would accept, checked as
 * text so a cost is never put through `Number` to be validated. Shared by the
 * create form and the row's cost edit.
 */
export function isValidCost(cost: string): boolean {
  return COST_PATTERN.test(cost);
}

/** How a course is named to a human — course type, lesson structure, occurrence. */
export function courseName(course: Course): string {
  return [
    COURSE_TYPE_LABELS[course.courseType],
    LESSON_TYPE_LABELS[course.lessonType],
    DURATION_TYPE_LABELS[course.durationType],
    OCCURRENCE_TYPE_LABELS[course.occurrenceType],
  ].join(' · ');
}
