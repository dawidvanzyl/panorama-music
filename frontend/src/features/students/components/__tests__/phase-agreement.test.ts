import { describe, it, expect } from 'vitest';
import { PHASE_MUST_MATCH, phaseConflictMessage } from '../phase-agreement';
import type { PhaseType, StudentExtraCurricular } from '../../services/student-extra-curriculars';

function activity(description: string, phase: PhaseType): StudentExtraCurricular {
  return {
    extraCurricularId: description,
    description,
    phase,
    practiceTimes: [{ practiceTimeId: `${description}-pt`, day: 'Monday', startTime: '15:00:00' }],
  };
}

describe('phaseConflictMessage', { tags: ['345UC6'] }, () => {
  it('names the one conflicting activity', () => {
    expect(phaseConflictMessage('Senior', [activity('Choir', 'Junior')])).toBe(
      `${PHASE_MUST_MATCH} Remove the Junior extra-curricular (Choir) before changing the phase to Senior.`,
    );
  });

  it('names every conflicting activity in held order', () => {
    expect(phaseConflictMessage('Senior', [activity('A', 'Junior'), activity('B', 'Junior')])).toBe(
      `${PHASE_MUST_MATCH} Remove the Junior extra-curriculars (A, B) before changing the phase to Senior.`,
    );
  });

  it('names only the activities of the other phase for a student holding both', () => {
    expect(phaseConflictMessage('Junior', [activity('Choir', 'Junior'), activity('Orchestra', 'Senior')])).toBe(
      `${PHASE_MUST_MATCH} Remove the Senior extra-curricular (Orchestra) before changing the phase to Junior.`,
    );
  });

  it('is null when there is no phase', () => {
    expect(phaseConflictMessage(null, [activity('Choir', 'Junior')])).toBeNull();
  });

  it('is null when every held activity agrees', () => {
    expect(phaseConflictMessage('Junior', [activity('Choir', 'Junior')])).toBeNull();
    expect(phaseConflictMessage('Junior', [])).toBeNull();
  });
});
