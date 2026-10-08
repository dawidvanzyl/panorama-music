import { PHASE_LABELS } from './extra-curricular-options';
import type { PhaseType, StudentExtraCurricular } from '../services/student-extra-curriculars';

export const PHASE_MUST_MATCH = "The student's phase must match the phase of their extra-curriculars.";

/**
 * Why the chosen phase cannot be saved against the activities the student holds,
 * or null when it can. A student with no phase disagrees with nothing.
 */
export function phaseConflictMessage(phase: PhaseType | null, held: readonly StudentExtraCurricular[]): string | null {
  if (phase === null) return null;

  const conflicting = held.filter((activity) => activity.phase !== phase);
  if (conflicting.length === 0) return null;

  const noun = conflicting.length === 1 ? 'extra-curricular' : 'extra-curriculars';
  const names = conflicting.map((activity) => activity.description).join(', ');
  return `${PHASE_MUST_MATCH} Remove the ${PHASE_LABELS[conflicting[0].phase]} ${noun} (${names}) before changing the phase to ${PHASE_LABELS[phase]}.`;
}
