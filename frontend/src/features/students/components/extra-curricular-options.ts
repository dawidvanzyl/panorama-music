import type { DayType, PhaseType, PracticeTime, StudentExtraCurricular } from '../services/student-extra-curriculars';

/**
 * How an extra-curricular activity is named and shown inside the Student modal.
 * The server returns enum members and a raw time of day, so the wording and
 * formatting the design specifies lives here rather than being spelled out in
 * the tab and the picker separately.
 */

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
 * Twenty-four hour, no seconds. The server sends a time of day as `HH:mm:ss`;
 * it is trimmed rather than put through `Date`, which would attach a calendar
 * day and a timezone to a value that has neither.
 */
export function startTimeText(startTime: string): string {
  return startTime.slice(0, 5);
}

/** How one weekly slot reads. */
export function practiceTimeText(practiceTime: PracticeTime): string {
  return `${DAY_LABELS[practiceTime.day]} ${startTimeText(practiceTime.startTime)}`;
}

/** The table's Practice Times column: every slot, in the order the server settled. */
export function practiceTimesText(extraCurricular: StudentExtraCurricular): string {
  return extraCurricular.practiceTimes.map(practiceTimeText).join(' · ');
}

/**
 * How the picker labels an option: the activity's description, alone. A student
 * is assigned to an activity and never to one of its practice times, so naming a
 * slot in the option would state something false — an activity meeting twice
 * would read as a choice between its two slots, with the second hidden. The
 * whole set is what the assigned row then shows.
 */
export function activityOptionLabel(extraCurricular: StudentExtraCurricular): string {
  return extraCurricular.description;
}

/** Stands in for the rows when the student takes part in nothing. */
export const NO_ACTIVITIES_ASSIGNED = 'No extra-curricular activities assigned.';

/** Why the picker's list is limited to one phase, shown beneath the panel's fields. */
export const PHASE_RESTRICTION_NOTE = "Only activities for this student's phase are offered.";
