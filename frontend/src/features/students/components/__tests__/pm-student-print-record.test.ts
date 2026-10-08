import { describe, it, expect } from 'vitest';
import { PmStudentPrintRecord } from '../pm-student-print-record';
import { printedOnLine, type StudentRecordSource } from '../student-record';
import type { StudentResult } from '../../services/students';

function student(overrides: Partial<StudentResult> = {}): StudentResult {
  return {
    studentId: 's1',
    firstName: 'Thandi',
    lastName: 'Mokoena',
    dateOfBirth: '2015-03-12',
    grade: 'Grade5',
    class: 'E2',
    phase: 'Junior',
    language: 'English',
    ...overrides,
  };
}

function source(overrides: Partial<StudentRecordSource> = {}): StudentRecordSource {
  return { student: student(), siblings: [], guardians: [], enrollments: [], extraCurriculars: [], ...overrides };
}

function render(record: StudentRecordSource): ShadowRoot {
  const element = new PmStudentPrintRecord();
  document.body.appendChild(element);
  element.show(record, '2026-10-04');
  return element.shadowRoot!;
}

function pairs(root: ShadowRoot): string[][] {
  return Array.from(root.querySelectorAll('.print-record__detail')).map((detail) => [
    detail.querySelector('.print-record__label')!.textContent!,
    detail.querySelector('.print-record__value')!.textContent!,
  ]);
}

describe('printed record opening line', { tags: ['346UC2'] }, () => {
  it('opens with the printed-on line', () => {
    expect(printedOnLine('2026-10-04')).toBe('Printed on 2026-10-04');

    const root = render(source());

    expect(root.getElementById('printedOn')!.textContent).toBe('Printed on 2026-10-04');
    expect(root.querySelector('#root')!.firstElementChild).toBe(root.getElementById('printedOn'));
  });
});

describe('printed record details of a graded student', { tags: ['346UC3'] }, () => {
  it('names the student then lists the details in order', () => {
    const root = render(source());

    expect(root.getElementById('studentName')!.textContent).toBe('Thandi Mokoena');
    expect(pairs(root)).toEqual([
      ['Grade', 'Grade 5'],
      ['Phase', 'Junior'],
      ['Class', 'E2'],
      ['Language', 'English'],
      ['Date of Birth', '2015-03-12'],
    ]);
  });
});

describe('printed record details of a Private-grade student', { tags: ['346UC4'] }, () => {
  it('leaves out Phase and Class', () => {
    const root = render(source({ student: student({ grade: 'Private', phase: null, class: null }) }));

    expect(pairs(root)).toEqual([
      ['Grade', 'Private'],
      ['Language', 'English'],
      ['Date of Birth', '2015-03-12'],
    ]);
  });
});

describe('printed record empty sections', { tags: ['346UC9'] }, () => {
  it('shows the four empty states in section order', () => {
    const root = render(source());

    const empties = Array.from(root.querySelectorAll('section')).map((section) => [
      section.id,
      section.querySelector('.print-record__empty')!.textContent,
    ]);

    expect(empties).toEqual([
      ['siblingsSection', 'No siblings linked.'],
      ['guardiansSection', 'No guardians linked.'],
      ['coursesSection', 'No course enrollments.'],
      ['extraCurricularsSection', 'No extra-curricular activities assigned.'],
    ]);
  });
});
