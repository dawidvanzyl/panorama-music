import type { DayType, ExtraCurricular, PhaseType, PracticeTime } from './extra-curriculars';

/**
 * How extra-curricular values are named and shown. The server returns enum
 * members and a raw time of day, so the wording and formatting the design
 * specifies lives here, in one place, rather than being spelled out in each
 * component that renders it.
 */

export const PHASES: PhaseType[] = ['Junior', 'Senior'];

export const DAYS: DayType[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const PHASE_LABELS: Record<PhaseType, string> = {
  Junior: 'Junior',
  Senior: 'Senior',
};

export const DAY_LABELS: Record<DayType, string> = {
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday',
  Sunday: 'Sunday',
};

/**
 * Twenty-four hour, no seconds. The server sends a time of day as `HH:mm:ss`
 * and a time input produces `HH:mm`; both are trimmed to the same shape here
 * rather than being put through `Date`, which would attach a calendar day and a
 * timezone to a value that has neither.
 */
export function startTimeText(startTime: string): string {
  return startTime.slice(0, 5);
}

/** How one slot reads — on a staged chip, and inside the table's cell. */
export function practiceTimeText(practiceTime: PracticeTime | { day: DayType; startTime: string }): string {
  return `${DAY_LABELS[practiceTime.day]} ${startTimeText(practiceTime.startTime)}`;
}

/** The table's Practice Times column: every slot of the activity, in the order the server settled. */
export function practiceTimesText(extraCurricular: ExtraCurricular): string {
  return extraCurricular.practiceTimes.map(practiceTimeText).join(' · ');
}

/** The expanded panel's heading, naming the activity whose slots it shows. */
export function practiceTimesHeading(description: string): string {
  return `Practice Times — ${description}`;
}

export const NO_PRACTICE_TIME_ERROR = 'An activity must have at least one practice time.';

export const MISSING_ERROR = 'Enter a description and choose a phase.';

export const MISSING_SLOT_ERROR = 'Choose a day and a start time.';

/**
 * Why an activity in use cannot go, named against the row that offered the
 * delete — the same words the server refuses the deletion with.
 */
export function cannotDeleteError(description: string, assignedStudents: number): string {
  return `${description} has ${assignedStudents} assigned student(s) and cannot be deleted.`;
}

/** The confirmation's body, naming the activity and what goes with it. */
export function deleteActivityBody(description: string, practiceTimeCount: number): string {
  return `This action cannot be undone. The activity ${description} and its ${practiceTimeCount} practice time(s) will be permanently removed.`;
}

/** Refuses a slot the form already holds, naming the one it is about. */
export function duplicatePracticeTimeError(practiceTime: { day: DayType; startTime: string }): string {
  return `${practiceTimeText(practiceTime)} is already a practice time for this activity.`;
}
