import type { DayType, ExtraCurricular, PhaseType } from './extra-curriculars';

export interface ExtraCurricularFilters {
  description?: string;
  phase?: PhaseType;
  day?: DayType;
}

/**
 * Applies the description, phase and day filters to a cached catalogue — a
 * client-side concern, not a server round trip. The description matches on any
 * part of it, case-insensitively; the day matches an activity holding a practice
 * time on that day, not one whose every slot falls on it.
 */
export function filterExtraCurriculars(
  extraCurriculars: ExtraCurricular[],
  filters: ExtraCurricularFilters,
): ExtraCurricular[] {
  const description = filters.description?.trim().toLocaleLowerCase();

  return extraCurriculars.filter((extraCurricular) => {
    if (description && !extraCurricular.description.toLocaleLowerCase().includes(description)) return false;
    if (filters.phase && extraCurricular.phase !== filters.phase) return false;
    if (filters.day && !extraCurricular.practiceTimes.some((slot) => slot.day === filters.day)) return false;
    return true;
  });
}
