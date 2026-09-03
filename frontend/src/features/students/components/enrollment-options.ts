import type { CourseType, EnrollableCourse, EnrollmentResult, InstrumentType, StepType } from '../services/enrollments';
import {
  COURSE_TYPE_LABELS,
  LESSON_TYPE_LABELS,
  DURATION_TYPE_LABELS,
  OCCURRENCE_TYPE_LABELS,
  INSTRUMENT_TYPE_LABELS,
} from '../../../services/lesson-structure';

/**
 * How enrollment values are named and shown. The server returns enum members
 * only, so the wording the design specifies lives here, in one place, rather
 * than being spelled out in each component that renders it.
 */

export const INSTRUMENT_TYPES: InstrumentType[] = ['Piano', 'Guitar', 'Recorder', 'Keyboard', 'Voice', 'Other'];

export const STEP_TYPES: StepType[] = [
  'Step1A',
  'Step1B',
  'Step2A',
  'Step2B',
  'Step3A',
  'Step3B',
  'Step4A',
  'Step4B',
  'Other',
];

// Shared with the Courses feature via services/lesson-structure.ts (ruling
// R6) — re-exported here so existing imports from this module keep working.
// COURSE_TYPE_LABELS is used locally (courseLabel below) but not
// re-exported: nothing outside this file has ever imported it from here.
export { LESSON_TYPE_LABELS, DURATION_TYPE_LABELS, OCCURRENCE_TYPE_LABELS, INSTRUMENT_TYPE_LABELS };

/** The bare step, as the table and the selects show it ("2A", not "Step 2A"). */
export const STEP_TYPE_LABELS: Record<StepType, string> = {
  Step1A: '1A',
  Step1B: '1B',
  Step2A: '2A',
  Step2B: '2B',
  Step3A: '3A',
  Step3B: '3B',
  Step4A: '4A',
  Step4B: '4B',
  Other: 'Other',
};

export const EM_DASH = '—';

/**
 * A course as a human reads it: course type, then the three dimensions of its
 * lesson structure. Both an offered course and a recorded enrollment name their
 * course this way, so the label is taken from the parts they have in common.
 */
export function courseLabel(course: EnrollableCourse | EnrollmentResult): string {
  return [
    COURSE_TYPE_LABELS[course.courseType],
    LESSON_TYPE_LABELS[course.lessonType],
    DURATION_TYPE_LABELS[course.durationType],
    OCCURRENCE_TYPE_LABELS[course.occurrenceType],
  ].join(' · ');
}

export function teacherLabel(enrollment: EnrollmentResult): string {
  return `${enrollment.teacherFirstName} ${enrollment.teacherSurname}`.trim();
}

/**
 * What the chosen course's type calls for. An instrument course records an
 * instrument type and a step, a theory course a step alone, and every other
 * course type neither — the same rule the domain enforces, applied here to
 * decide which selects the form offers.
 */
export function recordsInstrumentType(courseType: CourseType): boolean {
  return courseType === 'Instrument';
}

export function recordsStep(courseType: CourseType): boolean {
  return courseType === 'Instrument' || courseType === 'Theory';
}

/** Today, as the `yyyy-mm-dd` a date input and the API both expect. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
