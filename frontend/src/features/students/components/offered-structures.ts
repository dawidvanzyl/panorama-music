import {
  OCCURRENCE_TYPE_LABELS,
  LESSON_TYPE_LABELS,
  DURATION_TYPE_LABELS,
  type OccurrenceType,
  type LessonType,
  type DurationType,
} from '../../../services/lesson-structure';
import { populateSelectOptions, addPlaceholderOption } from './student-options';
import type { LessonStructure } from '../services/waiting-list';

/**
 * Rebuilds one of the dependent selects, keeping the current choice only where
 * it survives the narrowing. A choice the outer selects have just made
 * unreachable falls back to the placeholder rather than lingering as a value
 * the control no longer offers.
 */
export function fillOfferedOptions<T extends string>(
  select: HTMLSelectElement,
  values: T[],
  labels: Record<T, string>,
  placeholder: string,
): void {
  const previous = select.value;
  select.innerHTML = '';
  addPlaceholderOption(select, placeholder);
  populateSelectOptions<T>(select, values, (value) => labels[value]);
  select.value = (values as string[]).includes(previous) ? previous : '';
}

/**
 * The waiting-list surfaces present a lesson structure as three dependent
 * choices, and each choice is narrowed to what the ones before it leave
 * reachable. Deriving them from the offered structures rather than from the
 * enum vocabulary is what makes an unoffered combination unreachable: there is
 * no sequence of choices through the controls that arrives at one.
 *
 * <p>
 * Each list is ordered by the vocabulary rather than by whatever order the
 * structures arrive in, so During School always reads before After School.
 * </p>
 */
export function offeredOccurrenceTypes(structures: LessonStructure[]): OccurrenceType[] {
  return (Object.keys(OCCURRENCE_TYPE_LABELS) as OccurrenceType[]).filter((occurrenceType) =>
    structures.some((structure) => structure.occurrenceType === occurrenceType),
  );
}

export function offeredLessonTypes(structures: LessonStructure[], occurrenceType: string): LessonType[] {
  return (Object.keys(LESSON_TYPE_LABELS) as LessonType[]).filter((lessonType) =>
    structures.some((structure) => structure.occurrenceType === occurrenceType && structure.lessonType === lessonType),
  );
}

export function offeredDurationTypes(
  structures: LessonStructure[],
  occurrenceType: string,
  lessonType: string,
): DurationType[] {
  return (Object.keys(DURATION_TYPE_LABELS) as DurationType[]).filter((durationType) =>
    structures.some(
      (structure) =>
        structure.occurrenceType === occurrenceType &&
        structure.lessonType === lessonType &&
        structure.durationType === durationType,
    ),
  );
}
