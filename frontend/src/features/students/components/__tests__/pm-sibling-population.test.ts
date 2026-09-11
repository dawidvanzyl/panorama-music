import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmStudentSearchSelect } from '../pm-student-search-select';
import { PmSiblingList } from '../pm-sibling-list';
import { populationDescription } from '../student-population';
import type { SiblingStudentResult } from '../../services/students';

const waiting: SiblingStudentResult = {
  studentId: 's-waiting',
  firstName: 'Thandi',
  lastName: 'Mokoena',
  dateOfBirth: '2016-04-02',
  grade: 'Grade3',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
  population: 'WaitingList',
};

const enrolled: SiblingStudentResult = {
  ...waiting,
  studentId: 's-enrolled',
  firstName: 'Sipho',
  lastName: 'Mokoena',
  population: 'Enrolled',
};

const WAITING_LIST_MESSAGE = populationDescription('WaitingList');
const ENROLLED_MESSAGE = populationDescription('Enrolled');

function mountSearchSelect(candidates: SiblingStudentResult[]): PmStudentSearchSelect {
  const select = new PmStudentSearchSelect();
  document.body.appendChild(select);
  select.candidates = candidates;
  return select;
}

function search(select: PmStudentSearchSelect, query: string): void {
  const input = select.shadowRoot!.getElementById('query') as HTMLInputElement;
  input.value = query;
  input.dispatchEvent(new Event('input'));
}

function resultFor(select: PmStudentSearchSelect, studentId: string): HTMLElement {
  const result = select.shadowRoot!.querySelector<HTMLElement>(`[data-student-id="${studentId}"]`);
  if (!result) throw new Error(`No candidate row for ${studentId}`);
  return result;
}

function populationIconIn(row: Element): HTMLElement {
  const icon = row.querySelector<HTMLElement>('.pm-population-icon');
  if (!icon) throw new Error('Row carries no population icon');
  return icon;
}

function mountSiblingList(siblings: SiblingStudentResult[]): PmSiblingList {
  const list = new PmSiblingList();
  document.body.appendChild(list);
  list.siblings = siblings;
  return list;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('sibling candidate rows state their population', { tags: ['304UC10', '304UC11'] }, () => {
  let select: PmStudentSearchSelect;

  beforeEach(() => {
    select = mountSearchSelect([waiting, enrolled]);
  });

  it('marks a waiting-list candidate, with the meaning on the icon', { tags: ['304UC10'] }, () => {
    search(select, 'Thandi');

    const icon = populationIconIn(resultFor(select, 's-waiting'));
    expect(icon.title).toBe(WAITING_LIST_MESSAGE);
    expect(icon.getAttribute('aria-label')).toBe(WAITING_LIST_MESSAGE);
    expect(icon.title).toContain('waiting list');
    expect(icon.textContent).toBe('pending_actions');
  });

  it('marks an enrolled candidate too, distinctly', { tags: ['304UC11'] }, () => {
    search(select, 'Sipho');

    const icon = populationIconIn(resultFor(select, 's-enrolled'));
    expect(icon.title).toBe(ENROLLED_MESSAGE);
    expect(icon.getAttribute('aria-label')).toBe(ENROLLED_MESSAGE);
    expect(icon.title).toContain('enrolled');
    // Neither state is inferred from the absence of the other, and the two must
    // say different things: one affordance on every row informs nobody.
    expect(ENROLLED_MESSAGE).not.toBe(WAITING_LIST_MESSAGE);
  });

  it('marks both when one search offers both', { tags: ['304UC10', '304UC11'] }, () => {
    search(select, 'Mokoena');

    expect(populationIconIn(resultFor(select, 's-waiting')).title).toBe(WAITING_LIST_MESSAGE);
    expect(populationIconIn(resultFor(select, 's-enrolled')).title).toBe(ENROLLED_MESSAGE);
  });
});

describe('linked sibling rows state each sibling own population', { tags: ['304UC12'] }, () => {
  it('gives a mixed sibling group one icon per sibling, each for that sibling', () => {
    const list = mountSiblingList([waiting, enrolled]);

    const rows = Array.from(list.shadowRoot!.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);

    // The two rows sit in one table and differ only by the linked student's own
    // state, so an icon taken from the student the group was reached through —
    // or from the screen it is read on — renders the same thing twice here.
    const [waitingRow, enrolledRow] = rows;
    expect(waitingRow.textContent).toContain('Thandi');
    expect(populationIconIn(waitingRow).title).toBe(WAITING_LIST_MESSAGE);
    expect(enrolledRow.textContent).toContain('Sipho');
    expect(populationIconIn(enrolledRow).title).toBe(ENROLLED_MESSAGE);
  });

  it('leaves no row bare', () => {
    const list = mountSiblingList([enrolled]);

    const icons = list.shadowRoot!.querySelectorAll('tbody .pm-population-icon');
    expect(icons).toHaveLength(1);
    expect((icons[0] as HTMLElement).getAttribute('aria-label')).toBe(ENROLLED_MESSAGE);
  });
});
