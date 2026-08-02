import { describe, it, expect, afterEach } from 'vitest';
import '../pm-teacher-table';
import type { PmTeacherTable } from '../pm-teacher-table';
import type { TeacherResult } from '../../services/teachers';

const naomi: TeacherResult = {
  teacherId: 't1',
  firstName: 'Naomi',
  surname: 'Fischer',
  isPrivate: false,
  isActive: true,
  linkedAccountId: 'acc-1',
};

const tomas: TeacherResult = {
  teacherId: 't2',
  firstName: 'Tomas',
  surname: 'Rieder',
  isPrivate: true,
  isActive: false,
  linkedAccountId: null,
};

async function mountTable(teachers: TeacherResult[]): Promise<PmTeacherTable> {
  const el = document.createElement('pm-teacher-table') as PmTeacherTable;
  document.body.appendChild(el);
  el.teachers = teachers;
  return el;
}

describe('pm-teacher-table', { tags: ['231UC7'] }, () => {
  let el: PmTeacherTable | null = null;

  afterEach(() => {
    if (el) document.body.removeChild(el);
    el = null;
  });

  it('renders one pm-teacher-row per teacher with name, type, and status', async () => {
    el = await mountTable([naomi, tomas]);

    const rows = el.shadowRoot!.getElementById('rows')!.querySelectorAll('pm-teacher-row');
    expect(rows.length).toBe(2);

    const firstRowShadow = rows[0].shadowRoot!;
    expect(firstRowShadow.getElementById('name')!.textContent).toBe('Naomi Fischer');
    expect(firstRowShadow.getElementById('typeChip')!.textContent).toBe('School-paid');
    expect(firstRowShadow.getElementById('statusChip')!.textContent).toBe('Active');

    const secondRowShadow = rows[1].shadowRoot!;
    expect(secondRowShadow.getElementById('name')!.textContent).toBe('Tomas Rieder');
    expect(secondRowShadow.getElementById('typeChip')!.textContent).toBe('Private');
    expect(secondRowShadow.getElementById('statusChip')!.textContent).toBe('Deactivated');
  });

  it('shows the empty state and no rows when the list is empty', async () => {
    el = await mountTable([]);

    const rows = el.shadowRoot!.getElementById('rows')!.querySelectorAll('pm-teacher-row');
    expect(rows.length).toBe(0);
    expect(el.shadowRoot!.getElementById('empty')!.hidden).toBe(false);
  });
});
