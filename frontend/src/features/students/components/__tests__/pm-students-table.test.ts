import { describe, it, expect } from 'vitest';
import { PmStudentsTable } from '../pm-students-table';
import type { StudentResult } from '../../services/students';
import type { StudentRecordSource } from '../student-record';

function student(id: string, firstName: string): StudentResult {
  return {
    studentId: id,
    firstName,
    lastName: 'Mokoena',
    dateOfBirth: '2015-03-12',
    grade: 'Grade5',
    class: 'E2',
    phase: 'Junior',
    language: 'English',
  };
}

const thandi = student('s1', 'Thandi');
const naledi = student('s2', 'Naledi');

function mount(): PmStudentsTable {
  const table = new PmStudentsTable();
  document.body.appendChild(table);
  table.students = [thandi, naledi];
  return table;
}

function toggle(table: PmStudentsTable, studentId: string): void {
  const index = [thandi, naledi].findIndex((s) => s.studentId === studentId);
  const chevrons = table.shadowRoot!.querySelectorAll<HTMLButtonElement>('.students-table__chevron-btn');
  chevrons[index].click();
}

function summaryCell(table: PmStudentsTable, studentId: string): HTMLElement {
  return table.shadowRoot!.querySelector(`tr[data-student-id="${studentId}"] td`)!;
}

function printButton(table: PmStudentsTable, studentId: string): HTMLButtonElement | null {
  return summaryCell(table, studentId).querySelector('.students-table__btn--print');
}

describe('students table Print action', { tags: ['346UC1'] }, () => {
  it('offers Print only once the expanded row is marked loaded', () => {
    const table = mount();

    toggle(table, 's1');
    expect(printButton(table, 's1')).toBeNull();

    table.markSummaryLoaded('s1');

    const bar = summaryCell(table, 's1').firstElementChild!;
    expect(bar.classList).toContain('students-table__summary-actions');
    expect(bar.querySelector('button')!.textContent).toBe('Print');
    expect(printButton(table, 's2')).toBeNull();
  });

  it('offers no Print on a collapsed row, even when marked loaded', () => {
    const table = mount();

    table.markSummaryLoaded('s1');

    expect(printButton(table, 's1')).toBeNull();
  });

  it('withholds Print again after the row is collapsed and re-expanded', () => {
    const table = mount();
    toggle(table, 's1');
    table.markSummaryLoaded('s1');

    toggle(table, 's1');
    toggle(table, 's1');

    expect(printButton(table, 's1')).toBeNull();
  });

  it('keeps Print on a loaded row when another row is toggled', () => {
    const table = mount();
    toggle(table, 's1');
    table.markSummaryLoaded('s1');

    toggle(table, 's2');

    expect(printButton(table, 's1')).not.toBeNull();
  });

  it('emits the student and the lists the row holds when Print is clicked', () => {
    const table = mount();
    toggle(table, 's1');
    const siblings = [naledi];
    const extraCurriculars = [
      { extraCurricularId: 'e1', description: 'Choir', phase: 'Junior' as const, practiceTimes: [] },
    ];
    table.setSiblingsSummary('s1', siblings);
    table.setGuardiansSummary('s1', []);
    table.setCoursesSummary('s1', []);
    table.setExtraCurricularsSummary('s1', extraCurriculars);
    table.markSummaryLoaded('s1');

    let detail: StudentRecordSource | undefined;
    table.addEventListener('student-print-requested', (event) => {
      detail = (event as CustomEvent<StudentRecordSource>).detail;
    });
    printButton(table, 's1')!.click();

    expect(detail).toEqual({ student: thandi, siblings, guardians: [], enrollments: [], extraCurriculars });
  });
});
