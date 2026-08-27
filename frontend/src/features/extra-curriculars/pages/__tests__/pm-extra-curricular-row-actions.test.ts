import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ExtraCurricularsError,
  countExtraCurricularStudents,
  createExtraCurricular,
  deleteExtraCurricular,
  updateExtraCurricular,
  type ExtraCurricular,
} from '../../services/extra-curriculars';

const mockGetExtraCurriculars = vi.fn();
const mockHasAnyRole = vi.fn();

vi.mock('../../services/extra-curriculars', async () => {
  const actual = await vi.importActual<typeof import('../../services/extra-curriculars')>(
    '../../services/extra-curriculars',
  );
  return {
    ...actual,
    getExtraCurriculars: () => mockGetExtraCurriculars(),
    createExtraCurricular: vi.fn(),
    updateExtraCurricular: vi.fn(),
    countExtraCurricularStudents: vi.fn(),
    deleteExtraCurricular: vi.fn(),
  };
});

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasAnyRole: (roles: string[]) => mockHasAnyRole(roles) };
});

import '../pm-extra-curriculars-page';
import type { PmExtraCurricularTable } from '../../components/pm-extra-curricular-table';
import type { PmDeleteExtraCurricularModal } from '../../components/pm-delete-extra-curricular-modal';

const marimba: ExtraCurricular = {
  extraCurricularId: 'ec1',
  description: 'Marimba Band',
  phase: 'Junior',
  practiceTimes: [
    { practiceTimeId: 'pt1', day: 'Monday', startTime: '15:00:00' },
    { practiceTimeId: 'pt2', day: 'Thursday', startTime: '15:00:00' },
  ],
};

const choir: ExtraCurricular = {
  extraCurricularId: 'ec2',
  description: 'Junior Choir',
  phase: 'Junior',
  practiceTimes: [{ practiceTimeId: 'pt4', day: 'Tuesday', startTime: '14:30:00' }],
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-extra-curriculars-page');
  document.body.appendChild(el);
  await flush();
  await flush();
  return el;
}

function tableOf(el: HTMLElement): PmExtraCurricularTable {
  return el.shadowRoot!.getElementById('table') as unknown as PmExtraCurricularTable;
}

function modalOf(el: HTMLElement): PmDeleteExtraCurricularModal {
  return el.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteExtraCurricularModal;
}

function rowOf(el: HTMLElement, extraCurricularId: string): HTMLTableRowElement {
  return tableOf(el).shadowRoot!.querySelector(
    `tr[data-extra-curricular-id="${extraCurricularId}"]`,
  ) as HTMLTableRowElement;
}

function cellsOf(row: HTMLTableRowElement): string[] {
  return [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? '');
}

function buttonIn(row: HTMLTableRowElement, label: string): HTMLButtonElement {
  const buttons = [...row.querySelectorAll('button')] as HTMLButtonElement[];
  return buttons.find((button) => button.textContent === label)!;
}

/** The refusal banner shown against a row, if one is on screen. */
function rowErrorOf(el: HTMLElement): string | null {
  const banner = tableOf(el).shadowRoot!.querySelector('.ec-table__error');
  return banner ? (banner.textContent ?? '') : null;
}

function descriptionInputOf(el: HTMLElement): HTMLInputElement {
  return tableOf(el).shadowRoot!.getElementById('descriptionInput') as HTMLInputElement;
}

function phaseSelectOf(el: HTMLElement): HTMLSelectElement {
  return tableOf(el).shadowRoot!.getElementById('phaseSelect') as HTMLSelectElement;
}

/** Opens the row for editing and puts the given values into its inputs. */
async function edit(el: HTMLElement, extraCurricularId: string, description: string, phase: string): Promise<void> {
  buttonIn(rowOf(el, extraCurricularId), 'Edit').dispatchEvent(new MouseEvent('click'));
  await flush();

  const input = descriptionInputOf(el);
  input.value = description;
  input.dispatchEvent(new Event('input'));

  const select = phaseSelectOf(el);
  select.value = phase;
  select.dispatchEvent(new Event('change'));
  await flush();
}

async function pressDelete(el: HTMLElement, extraCurricularId: string): Promise<void> {
  buttonIn(rowOf(el, extraCurricularId), 'Delete').dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

function modalTextOf(el: HTMLElement): string {
  return (modalOf(el).shadowRoot!.querySelector('.modal__body') as HTMLElement).textContent!.replaceAll(/\s+/g, ' ').trim();
}

function modalIsOpen(el: HTMLElement): boolean {
  return (modalOf(el) as unknown as HTMLElement).hasAttribute('open');
}

async function pressInModal(el: HTMLElement, id: string): Promise<void> {
  modalOf(el).shadowRoot!.getElementById(id)!.dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

beforeEach(() => {
  mockHasAnyRole.mockReset();
  mockHasAnyRole.mockReturnValue(true);
  mockGetExtraCurriculars.mockReset();
  mockGetExtraCurriculars.mockResolvedValue([marimba, choir]);
  vi.mocked(createExtraCurricular).mockReset();
  vi.mocked(updateExtraCurricular).mockReset();
  vi.mocked(countExtraCurricularStudents).mockReset();
  vi.mocked(countExtraCurricularStudents).mockResolvedValue({ count: 0 });
  vi.mocked(deleteExtraCurricular).mockReset();
  vi.mocked(deleteExtraCurricular).mockResolvedValue(undefined);
});

describe('pm-extra-curriculars-page — entering edit mode', { tags: ['278UC11'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('makes the description and phase editable and leaves the practice times read-only', async () => {
    el = await mountPage();

    buttonIn(rowOf(el, 'ec1'), 'Edit').dispatchEvent(new MouseEvent('click'));
    await flush();

    const row = rowOf(el, 'ec1');
    expect(descriptionInputOf(el).value).toBe('Marimba Band');
    expect(phaseSelectOf(el).value).toBe('Junior');
    // The slots are still text in their own cell, with nothing to change one —
    // a slot is only ever added and removed from the expanded panel.
    expect(cellsOf(row)[3]).toBe('Monday 15:00 · Thursday 15:00');
    expect(row.querySelectorAll('input, select')).toHaveLength(2);
    expect(buttonIn(row, 'Save')).toBeDefined();
    expect(buttonIn(row, 'Cancel')).toBeDefined();
  });
});

describe('pm-extra-curriculars-page — abandoning an edit', { tags: ['278UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('restores the stored description and phase and sends nothing', async () => {
    el = await mountPage();
    await edit(el, 'ec1', 'Marimba Ensemble', 'Senior');

    buttonIn(rowOf(el, 'ec1'), 'Cancel').dispatchEvent(new MouseEvent('click'));
    await flush();

    expect(cellsOf(rowOf(el, 'ec1'))[1]).toBe('Marimba Band');
    expect(cellsOf(rowOf(el, 'ec1'))[2]).toBe('Junior');
    expect(vi.mocked(updateExtraCurricular)).not.toHaveBeenCalled();
  });
});

describe('pm-extra-curriculars-page — saving an edit', { tags: ['278UC13'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('sends the update and shows the new description and phase badge', async () => {
    vi.mocked(updateExtraCurricular).mockResolvedValue({
      ...marimba,
      description: 'Marimba Ensemble',
      phase: 'Senior',
    });
    el = await mountPage();
    await edit(el, 'ec1', 'Marimba Ensemble', 'Senior');

    buttonIn(rowOf(el, 'ec1'), 'Save').dispatchEvent(new MouseEvent('click'));
    await flush();
    await flush();

    expect(vi.mocked(updateExtraCurricular)).toHaveBeenCalledWith('ec1', {
      description: 'Marimba Ensemble',
      phase: 'Senior',
    });
    const cells = cellsOf(rowOf(el, 'ec1'));
    expect(cells[1]).toBe('Marimba Ensemble');
    expect(cells[2]).toBe('Senior');
    // Back in its read state, and the slots came through the edit untouched.
    expect(cells[3]).toBe('Monday 15:00 · Thursday 15:00');
    expect(buttonIn(rowOf(el, 'ec1'), 'Edit')).toBeDefined();
  });
});

describe('pm-extra-curriculars-page — saving an empty description', { tags: ['278UC14'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows a validation message against the row and sends nothing', async () => {
    el = await mountPage();
    await edit(el, 'ec1', '   ', 'Junior');

    buttonIn(rowOf(el, 'ec1'), 'Save').dispatchEvent(new MouseEvent('click'));
    await flush();

    expect(rowErrorOf(el)).toBe('Enter a description and choose a phase.');
    expect(vi.mocked(updateExtraCurricular)).not.toHaveBeenCalled();
    // The row stays in edit mode holding what was entered, so it can be
    // corrected rather than started again.
    expect(descriptionInputOf(el)).not.toBeNull();
  });
});

describe('pm-extra-curriculars-page — a refused edit', { tags: ['278UC31'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows the refusal on the row and keeps the stored values', async () => {
    vi.mocked(updateExtraCurricular).mockRejectedValue(
      new ExtraCurricularsError('Junior already has an activity called "Junior Choir".', 400),
    );
    el = await mountPage();
    await edit(el, 'ec1', 'Junior Choir', 'Junior');

    buttonIn(rowOf(el, 'ec1'), 'Save').dispatchEvent(new MouseEvent('click'));
    await flush();
    await flush();

    expect(rowErrorOf(el)).toBe('Junior already has an activity called "Junior Choir".');
    // Nothing was applied to the list, so cancelling now leaves the row exactly
    // as it was stored.
    buttonIn(rowOf(el, 'ec1'), 'Cancel').dispatchEvent(new MouseEvent('click'));
    await flush();
    expect(cellsOf(rowOf(el, 'ec1'))[1]).toBe('Marimba Band');
  });
});

describe('pm-extra-curriculars-page — confirming a deletion', { tags: ['278UC15'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('names the activity and its practice-time count and sends nothing until confirmed', async () => {
    el = await mountPage();

    await pressDelete(el, 'ec1');

    expect(modalIsOpen(el)).toBe(true);
    expect(modalTextOf(el)).toBe(
      'This action cannot be undone. The activity Marimba Band and its 2 practice time(s) will be permanently removed.',
    );
    expect(vi.mocked(deleteExtraCurricular)).not.toHaveBeenCalled();
  });
});

describe('pm-extra-curriculars-page — cancelling a deletion', { tags: ['278UC16'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('closes the confirmation with the activity still listed', async () => {
    el = await mountPage();
    await pressDelete(el, 'ec1');

    await pressInModal(el, 'cancelBtn');

    expect(modalIsOpen(el)).toBe(false);
    expect(vi.mocked(deleteExtraCurricular)).not.toHaveBeenCalled();
    expect(rowOf(el, 'ec1')).not.toBeNull();
  });
});

describe('pm-extra-curriculars-page — carrying out a deletion', { tags: ['278UC17'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('sends the delete and drops the row from the table', async () => {
    el = await mountPage();
    await pressDelete(el, 'ec1');

    await pressInModal(el, 'deleteBtn');

    expect(vi.mocked(deleteExtraCurricular)).toHaveBeenCalledWith('ec1');
    expect(rowOf(el, 'ec1')).toBeNull();
    // Only that one went.
    expect(rowOf(el, 'ec2')).not.toBeNull();
  });
});

describe('pm-extra-curriculars-page — an activity in use', { tags: ['278UC18'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows a row message naming the activity and its assigned-student count, and sends nothing', async () => {
    vi.mocked(countExtraCurricularStudents).mockResolvedValue({ count: 24 });
    el = await mountPage();

    await pressDelete(el, 'ec1');

    expect(rowErrorOf(el)).toBe('Marimba Band has 24 assigned student(s) and cannot be deleted.');
    // No confirmation is offered for something the server would refuse.
    expect(modalIsOpen(el)).toBe(false);
    expect(vi.mocked(deleteExtraCurricular)).not.toHaveBeenCalled();
  });
});

describe('pm-extra-curriculars-page — a viewer who may not maintain', { tags: ['278UC19'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('offers no Edit or Delete control on any row', async () => {
    mockHasAnyRole.mockReturnValue(false);
    el = await mountPage();

    const buttons = [...tableOf(el).shadowRoot!.querySelectorAll('tbody button')] as HTMLButtonElement[];
    const labels = buttons.map((button) => button.textContent);

    expect(labels).not.toContain('Edit');
    expect(labels).not.toContain('Delete');
    // The column itself is absent rather than empty, matching how the endpoints
    // answer a Teacher who is not a Coordinator.
    expect(cellsOf(rowOf(el, 'ec1'))).toHaveLength(4);
  });
});

describe('pm-extra-curriculars-page — a refused create', { tags: ['278UC30'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows the refusal against the form and adds nothing to the table', async () => {
    vi.mocked(createExtraCurricular).mockRejectedValue(
      new ExtraCurricularsError('Junior already has an activity called "Junior Choir".', 400),
    );
    el = await mountPage();

    const form = el.shadowRoot!.getElementById('form') as HTMLElement;
    (form.shadowRoot!.getElementById('description') as HTMLInputElement).value = 'Junior Choir';
    (form.shadowRoot!.getElementById('phase') as HTMLSelectElement).value = 'Junior';
    (form.shadowRoot!.getElementById('day') as HTMLSelectElement).value = 'Monday';
    (form.shadowRoot!.getElementById('startTime') as HTMLInputElement).value = '15:00';
    form.shadowRoot!.getElementById('addBtn')!.dispatchEvent(new MouseEvent('click'));
    await flush();
    form.shadowRoot!.getElementById('createBtn')!.dispatchEvent(new MouseEvent('click'));
    await flush();
    await flush();

    expect((form.shadowRoot!.getElementById('error') as HTMLElement).textContent).toBe(
      'Junior already has an activity called "Junior Choir".',
    );
    // Two rows still — the refused create wrote nothing and listed nothing.
    expect(tableOf(el).shadowRoot!.querySelectorAll('tr[data-extra-curricular-id]')).toHaveLength(2);
  });
});
