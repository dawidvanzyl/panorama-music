import { describe, it, expect, afterEach } from 'vitest';
import '../pm-teacher-table';
import type { PmTeacherTable } from '../pm-teacher-table';
import type { PmTeacherRow } from '../pm-teacher-row';
import type { TeacherResult } from '../../services/teachers';

const schoolPaidWithBanking: TeacherResult = {
  teacherId: 't1',
  firstName: 'Naomi',
  surname: 'Fischer',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
  banking: { bank: 'Absa', accountType: 'ChequeCurrent', branchCode: '632005', accountNumberLast4: '4321' },
};

const privateWithBanking: TeacherResult = {
  ...schoolPaidWithBanking,
  teacherId: 't2',
  firstName: 'Tomas',
  surname: 'Rieder',
  isPrivate: true,
  banking: { bank: 'Capitec', accountType: 'Savings', branchCode: '470010', accountNumberLast4: '7890' },
};

const withoutBanking: TeacherResult = {
  ...schoolPaidWithBanking,
  teacherId: 't3',
  firstName: 'Priya',
  surname: 'Okafor',
  banking: null,
};

let element: PmTeacherTable | null = null;

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('teachers list — the banking column is masked or absent', { tags: ['233UC17'] }, () => {
  it('shows the masked number or "None captured" for private and school-paid teachers alike', () => {
    element = document.createElement('pm-teacher-table') as PmTeacherTable;
    document.body.appendChild(element);
    element.teachers = [schoolPaidWithBanking, privateWithBanking, withoutBanking];

    const bankingCells = [...element.shadowRoot!.querySelectorAll('pm-teacher-row')].map(
      (row) => (row as PmTeacherRow).shadowRoot!.getElementById('banking')!.textContent,
    );

    expect(bankingCells).toEqual(['•••• •••• 4321', '•••• •••• 7890', 'None captured']);
    expect(element.shadowRoot!.textContent).toContain(
      'Account numbers are masked everywhere. The full value is only returned by an explicit reveal on the teacher',
    );
  });
});
