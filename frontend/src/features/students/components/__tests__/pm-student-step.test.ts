import { describe, it, expect, beforeEach } from 'vitest';
import '../pm-student-step';
import type { PmStudentStep } from '../pm-student-step';
import type { StudentResult } from '../../services/students';

function mountStep(): PmStudentStep {
  const el = document.createElement('pm-student-step') as PmStudentStep;
  document.body.appendChild(el);
  return el;
}

function classField(step: PmStudentStep): HTMLElement {
  return step.shadowRoot!.getElementById('classField') as HTMLElement;
}

function phaseField(step: PmStudentStep): HTMLElement {
  return step.shadowRoot!.getElementById('phaseField') as HTMLElement;
}

function gradeSelect(step: PmStudentStep): HTMLSelectElement {
  return step.shadowRoot!.getElementById('grade') as HTMLSelectElement;
}

function classSelect(step: PmStudentStep): HTMLSelectElement {
  return step.shadowRoot!.getElementById('class') as HTMLSelectElement;
}

function phaseSelect(step: PmStudentStep): HTMLSelectElement {
  return step.shadowRoot!.getElementById('phase') as HTMLSelectElement;
}

function selectGrade(step: PmStudentStep, grade: string): void {
  gradeSelect(step).value = grade;
  gradeSelect(step).dispatchEvent(new Event('change'));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pm-student-step: Private grade hides class/phase', { tags: ['206UC6'] }, () => {
  it('hides the class/phase fields, lifts their required constraint, and clears their value', () => {
    const step = mountStep();
    step.reset();

    selectGrade(step, 'Private');

    expect(classField(step).hidden).toBe(true);
    expect(phaseField(step).hidden).toBe(true);
    expect(classSelect(step).required).toBe(false);
    expect(phaseSelect(step).required).toBe(false);
    expect(step.getValues().class).toBeNull();
    expect(step.getValues().phase).toBeNull();
  });

  it('hides the class/phase fields when loading an existing Private-grade student', () => {
    const step = mountStep();
    const privateStudent: StudentResult = {
      studentId: 's1',
      firstName: 'Zanele',
      lastName: 'Mokoena',
      dateOfBirth: '2014-05-12',
      grade: 'Private',
      class: null,
      phase: null,
      language: 'English',
    };

    step.setValues(privateStudent);

    expect(classField(step).hidden).toBe(true);
    expect(phaseField(step).hidden).toBe(true);
  });
});

describe('pm-student-step: non-Private grade requires class/phase', { tags: ['206UC7'] }, () => {
  it('shows the class/phase fields and restores their required constraint', () => {
    const step = mountStep();
    step.reset();

    selectGrade(step, 'Private');
    selectGrade(step, 'Grade4');

    expect(classField(step).hidden).toBe(false);
    expect(phaseField(step).hidden).toBe(false);
    expect(classSelect(step).required).toBe(true);
    expect(phaseSelect(step).required).toBe(true);
  });

  it('shows the class/phase fields when loading an existing non-Private-grade student', () => {
    const step = mountStep();
    const student: StudentResult = {
      studentId: 's2',
      firstName: 'Alice',
      lastName: 'Vance',
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    };

    step.setValues(student);

    expect(classField(step).hidden).toBe(false);
    expect(phaseField(step).hidden).toBe(false);
    expect(step.getValues().class).toBe('A1');
    expect(step.getValues().phase).toBe('Junior');
  });
});
