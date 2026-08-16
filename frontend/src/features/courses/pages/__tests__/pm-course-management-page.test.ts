import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CoursesError,
  createCourse,
  deleteCourse,
  updateCourseCost,
  type Course,
  type LessonStructure,
} from '../../services/courses';

const mockGetCourses = vi.fn();
const mockGetLessonStructures = vi.fn();
const mockHasAnyRole = vi.fn();

vi.mock('../../services/courses', async () => {
  const actual = await vi.importActual<typeof import('../../services/courses')>('../../services/courses');
  return {
    ...actual,
    getCourses: () => mockGetCourses(),
    getLessonStructures: () => mockGetLessonStructures(),
    createCourse: vi.fn(),
    updateCourseCost: vi.fn(),
    deleteCourse: vi.fn(),
  };
});

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasAnyRole: (roles: string[]) => mockHasAnyRole(roles) };
});

import '../pm-course-management-page';
import type { PmCourseForm } from '../../components/pm-course-form';
import type { PmCourseTable } from '../../components/pm-course-table';
import type { PmDeleteCourseModal } from '../../components/pm-delete-course-modal';

const groupHourDuring: LessonStructure = {
  lessonStructureId: 'ls1',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'DuringSchool',
};

const individualHalfAfter: LessonStructure = {
  lessonStructureId: 'ls2',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'AfterSchool',
};

const theory: Course = {
  courseId: 'c1',
  courseType: 'Theory',
  cost: '120.00',
  lessonStructureId: 'ls1',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'DuringSchool',
};

const instrument: Course = {
  courseId: 'c2',
  courseType: 'Instrument',
  cost: '450.50',
  lessonStructureId: 'ls2',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'AfterSchool',
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-course-management-page');
  document.body.appendChild(el);
  await flush();
  await flush();
  return el;
}

function formOf(el: HTMLElement): PmCourseForm {
  return el.shadowRoot!.getElementById('form') as unknown as PmCourseForm;
}

function tableOf(el: HTMLElement): PmCourseTable {
  return el.shadowRoot!.getElementById('table') as unknown as PmCourseTable;
}

function filterBarOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('filterBar') as HTMLElement;
}

function formErrorOf(el: HTMLElement): HTMLElement {
  return formOf(el).shadowRoot!.getElementById('error') as HTMLElement;
}

function selectIn(el: HTMLElement, id: string): HTMLSelectElement {
  return formOf(el).shadowRoot!.getElementById(id) as HTMLSelectElement;
}

function costInputOf(el: HTMLElement): HTMLInputElement {
  return formOf(el).shadowRoot!.getElementById('cost') as HTMLInputElement;
}

function rowTextsOf(el: HTMLElement): string[][] {
  return dataRowsOf(el).map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? ''));
}

/** The course rows, leaving out any row carrying an inline error banner. */
function dataRowsOf(el: HTMLElement): HTMLTableRowElement[] {
  const rows = tableOf(el).shadowRoot!.querySelectorAll('tbody tr:not(.course-table__error-row)');
  return [...rows] as HTMLTableRowElement[];
}

function rowErrorOf(el: HTMLElement): string | null {
  return tableOf(el).shadowRoot!.querySelector('.course-table__error')?.textContent ?? null;
}

function actionsOf(el: HTMLElement, rowIndex: number): string[] {
  const buttons = dataRowsOf(el)[rowIndex].querySelectorAll('button');
  return [...buttons].map((button) => button.textContent ?? '');
}

function enabledActionsOf(el: HTMLElement, rowIndex: number): string[] {
  const buttons = dataRowsOf(el)[rowIndex].querySelectorAll('button');
  return [...buttons].filter((button) => !button.disabled).map((button) => button.textContent ?? '');
}

function clickRowAction(el: HTMLElement, rowIndex: number, label: string): void {
  const buttons = [...dataRowsOf(el)[rowIndex].querySelectorAll('button')];
  buttons.find((button) => button.textContent === label)!.dispatchEvent(new MouseEvent('click'));
}

function costInputInRow(el: HTMLElement, rowIndex: number): HTMLInputElement | null {
  return dataRowsOf(el)[rowIndex].querySelector('input');
}

async function typeCost(el: HTMLElement, rowIndex: number, value: string): Promise<void> {
  const input = costInputInRow(el, rowIndex)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await flush();
}

function deleteModalOf(el: HTMLElement): PmDeleteCourseModal {
  return el.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteCourseModal;
}

async function clickModalButton(el: HTMLElement, id: string): Promise<void> {
  (deleteModalOf(el) as unknown as HTMLElement).shadowRoot!.getElementById(id)!.dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

/** Drives the real form controls so the field state after submit can be asserted. */
async function submitCreateForm(el: HTMLElement, courseType: string, cost: string, structureId: string): Promise<void> {
  selectIn(el, 'courseType').value = courseType;
  costInputOf(el).value = cost;
  selectIn(el, 'lessonStructure').value = structureId;
  formOf(el).shadowRoot!.getElementById('createBtn')!.dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

function filterSelectOf(el: HTMLElement, id: string): HTMLSelectElement {
  return filterBarOf(el).shadowRoot!.getElementById(id) as HTMLSelectElement;
}

async function changeFilter(el: HTMLElement, id: string, value: string): Promise<void> {
  const select = filterSelectOf(el, id);
  select.value = value;
  select.dispatchEvent(new Event('change'));
  await flush();
  await flush();
}

beforeEach(() => {
  mockHasAnyRole.mockReset();
  mockHasAnyRole.mockReturnValue(true);
  mockGetCourses.mockReset();
  mockGetCourses.mockResolvedValue([theory, instrument]);
  mockGetLessonStructures.mockReset();
  mockGetLessonStructures.mockResolvedValue([groupHourDuring, individualHalfAfter]);
  vi.mocked(createCourse).mockReset();
  vi.mocked(updateCourseCost).mockReset();
  vi.mocked(deleteCourse).mockReset();
});

describe('pm-course-management-page — opens with the create form already open', { tags: ['257UC11'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('renders the create form above the filter bar with its three inputs and the create action', async () => {
    el = await mountPage();

    const children = [...el.shadowRoot!.querySelectorAll('*')].map((node) => node.id).filter(Boolean);
    expect(formOf(el).hidden).toBe(false);
    expect(children.indexOf('form')).toBeLessThan(children.indexOf('filterBar'));
    expect(selectIn(el, 'courseType')).not.toBeNull();
    expect(costInputOf(el)).not.toBeNull();
    expect(selectIn(el, 'lessonStructure')).not.toBeNull();
    expect(formOf(el).shadowRoot!.getElementById('createBtn')!.textContent).toBe('Create Course');
  });
});

describe('pm-course-management-page — offers fixed display text, never enum members', { tags: ['257UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('labels every course type and lesson structure option with its display text', async () => {
    el = await mountPage();

    const courseTypeLabels = [...selectIn(el, 'courseType').options].map((option) => option.textContent);
    const structureLabels = [...selectIn(el, 'lessonStructure').options].map((option) => option.textContent);

    expect(courseTypeLabels).toEqual([
      'Select a course type',
      'Theory',
      'GR Enrichment',
      'Grade 1 Enrichment',
      'Grade 2 Recorder',
      'Instrument',
    ]);
    expect(structureLabels).toEqual([
      'Select a lesson structure',
      'Group · Hour · During School',
      'Individual · Half Hour · After School',
    ]);
  });
});

describe('pm-course-management-page — creates a course and keeps the form ready', { tags: ['257UC13'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('lists the new course and clears the form for the next one', async () => {
    const created: Course = { ...instrument, courseId: 'c3', cost: '850.00' };
    vi.mocked(createCourse).mockResolvedValue(created);
    el = await mountPage();
    mockGetCourses.mockResolvedValue([theory, instrument, created]);

    await submitCreateForm(el, 'Instrument', '850.00', 'ls2');

    expect(createCourse).toHaveBeenCalledWith({
      courseType: 'Instrument',
      cost: '850.00',
      lessonStructureId: 'ls2',
    });
    expect(rowTextsOf(el)).toHaveLength(3);
    expect(selectIn(el, 'courseType').value).toBe('');
    expect(costInputOf(el).value).toBe('');
    expect(selectIn(el, 'lessonStructure').value).toBe('');
  });

  it('clears the filters so a course created outside the current selection is still shown', async () => {
    const created: Course = { ...instrument, courseId: 'c3', cost: '850.00' };
    vi.mocked(createCourse).mockResolvedValue(created);
    el = await mountPage();
    mockGetCourses.mockResolvedValue([theory, instrument, created]);

    // A filter that the course about to be created does not match.
    await changeFilter(el, 'courseType', 'Theory');
    expect(rowTextsOf(el)).toHaveLength(1);

    await submitCreateForm(el, 'Instrument', '850.00', 'ls2');

    expect(filterSelectOf(el, 'courseType').value).toBe('');
    expect(rowTextsOf(el)).toHaveLength(3);
  });
});

describe('pm-course-management-page — refuses an incomplete or invalid form', { tags: ['257UC14'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows an inline error and sends nothing when a required value is missing', async () => {
    el = await mountPage();

    await submitCreateForm(el, '', '120.00', 'ls1');

    expect(formErrorOf(el).textContent).toContain('Select a course type and a lesson structure');
    expect(createCourse).not.toHaveBeenCalled();
  });

  it('shows an inline error and sends nothing when the cost is not a valid amount', async () => {
    el = await mountPage();

    await submitCreateForm(el, 'Theory', '12.345', 'ls1');

    expect(formErrorOf(el).textContent).toContain('two decimals');
    expect(createCourse).not.toHaveBeenCalled();
  });
});

describe('pm-course-management-page — surfaces a rejected create on the form', { tags: ['257UC15'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows the reason inline and leaves the entered values in place', async () => {
    vi.mocked(createCourse).mockRejectedValue(new CoursesError("Lesson structure 'ls9' does not exist.", 400));
    el = await mountPage();

    await submitCreateForm(el, 'Theory', '120.00', 'ls1');

    expect(formErrorOf(el).textContent).toContain('does not exist');
    expect(selectIn(el, 'courseType').value).toBe('Theory');
    expect(costInputOf(el).value).toBe('120.00');
    expect(selectIn(el, 'lessonStructure').value).toBe('ls1');
  });
});

describe('pm-course-management-page — narrows the list by the filter selections', { tags: ['257UC16'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('narrows the cached catalogue to the selected course type without re-reading it', async () => {
    el = await mountPage();
    const readsOnLoad = mockGetCourses.mock.calls.length;

    await changeFilter(el, 'courseType', 'Instrument');

    expect(rowTextsOf(el)).toEqual([
      ['Instrument', 'Individual · Half Hour', 'After School', 'R 450.50', 'Edit CostDelete'],
    ]);
    expect(mockGetCourses.mock.calls.length).toBe(readsOnLoad);
  });

  it('combines a lesson type, duration and occurrence selection', async () => {
    el = await mountPage();

    await changeFilter(el, 'lessonType', 'Group');
    await changeFilter(el, 'durationType', 'Hour');
    await changeFilter(el, 'occurrenceType', 'DuringSchool');

    expect(rowTextsOf(el)).toEqual([['Theory', 'Group · Hour', 'During School', 'R 120.00', 'Edit CostDelete']]);
  });
});

describe('pm-course-management-page — shows an empty state when nothing matches', { tags: ['257UC17'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('renders the empty state in place of rows', async () => {
    el = await mountPage();

    await changeFilter(el, 'courseType', 'G2Recorder');

    expect(rowTextsOf(el)).toEqual([]);
    expect((tableOf(el).shadowRoot!.getElementById('empty') as HTMLElement).hidden).toBe(false);
  });
});

describe('pm-course-management-page — read-only for a non-maintainer', { tags: ['257UC18'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('leaves the create form, filter bar and actions column absent rather than disabled', async () => {
    mockHasAnyRole.mockReturnValue(false);
    el = await mountPage();

    expect(formOf(el).hidden).toBe(true);
    expect(filterBarOf(el).hidden).toBe(true);
    expect(tableOf(el).shadowRoot!.getElementById('actionsHeader')!.hidden).toBe(true);
    // The list itself is still read.
    expect(rowTextsOf(el)).toEqual([
      ['Theory', 'Group · Hour', 'During School', 'R 120.00'],
      ['Instrument', 'Individual · Half Hour', 'After School', 'R 450.50'],
    ]);
    expect(mockGetLessonStructures).not.toHaveBeenCalled();
  });
});

describe('pm-course-management-page — turns one row into a cost edit', { tags: ['258UC9'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('swaps that row cost for a prefilled input and its actions for Save and Cancel', async () => {
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');

    expect(costInputInRow(el, 0)!.value).toBe('120.00');
    expect(actionsOf(el, 0)).toEqual(['Save', 'Cancel']);
    // The other row is untouched: still its cost text, still its own actions,
    // and those actions stay live — an edit elsewhere does not disable them.
    expect(costInputInRow(el, 1)).toBeNull();
    expect(actionsOf(el, 1)).toEqual(['Edit Cost', 'Delete']);
    expect(enabledActionsOf(el, 1)).toEqual(['Edit Cost', 'Delete']);
  });
});

describe('pm-course-management-page — saves a corrected cost', { tags: ['258UC10'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('updates the cost and returns the row to display mode showing it', async () => {
    vi.mocked(updateCourseCost).mockResolvedValue({ ...theory, cost: '150.00' });
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');
    await typeCost(el, 0, '150.00');
    clickRowAction(el, 0, 'Save');
    await flush();
    await flush();

    expect(updateCourseCost).toHaveBeenCalledWith('c1', '150.00');
    expect(costInputInRow(el, 0)).toBeNull();
    expect(rowTextsOf(el)[0]).toContain('R 150.00');
    expect(actionsOf(el, 0)).toEqual(['Edit Cost', 'Delete']);
  });

  it('takes the row actions out of service while the save is in flight, so one click sends one request', async () => {
    let settle: (course: Course) => void = () => {};
    vi.mocked(updateCourseCost).mockReturnValue(
      new Promise<Course>((resolve) => {
        settle = resolve;
      }),
    );
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');
    await typeCost(el, 0, '150.00');
    clickRowAction(el, 0, 'Save');
    await flush();

    expect(enabledActionsOf(el, 0)).toEqual([]);
    clickRowAction(el, 0, 'Save');
    expect(updateCourseCost).toHaveBeenCalledTimes(1);

    settle({ ...theory, cost: '150.00' });
    await flush();
    await flush();

    expect(enabledActionsOf(el, 0)).toEqual(['Edit Cost', 'Delete']);
  });
});

describe('pm-course-management-page — abandons a cost edit on Cancel', { tags: ['258UC11'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('restores the original cost and sends nothing', async () => {
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');
    await typeCost(el, 0, '999.99');
    clickRowAction(el, 0, 'Cancel');

    expect(costInputInRow(el, 0)).toBeNull();
    expect(rowTextsOf(el)[0]).toContain('R 120.00');
    expect(updateCourseCost).not.toHaveBeenCalled();
  });
});

describe('pm-course-management-page — reports a refused cost against its row', { tags: ['258UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows an inline row error and sends nothing when the entered cost is invalid', async () => {
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');
    await typeCost(el, 0, '120.345');
    clickRowAction(el, 0, 'Save');
    await flush();

    expect(rowErrorOf(el)).toContain('two decimals');
    expect(updateCourseCost).not.toHaveBeenCalled();
    expect(costInputInRow(el, 0)!.value).toBe('120.345');
  });

  it('drops a minus sign as it is typed, so no negative cost can be entered', async () => {
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');
    await typeCost(el, 0, '-50.00');

    expect(costInputInRow(el, 0)!.value).toBe('50.00');
  });

  it('shows the reason inline and stays in edit mode when the save is rejected', async () => {
    vi.mocked(updateCourseCost).mockRejectedValue(new CoursesError('Course c1 was not found.', 404));
    el = await mountPage();

    clickRowAction(el, 0, 'Edit Cost');
    await typeCost(el, 0, '150.00');
    clickRowAction(el, 0, 'Save');
    await flush();
    await flush();

    expect(rowErrorOf(el)).toContain('was not found');
    expect(costInputInRow(el, 0)!.value).toBe('150.00');
    expect(actionsOf(el, 0)).toEqual(['Save', 'Cancel']);
  });
});

describe('pm-course-management-page — confirms a course deletion', { tags: ['258UC13'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('names the course by its type, lesson structure and occurrence', async () => {
    el = await mountPage();

    clickRowAction(el, 1, 'Delete');
    await flush();

    const modal = deleteModalOf(el) as unknown as HTMLElement;
    expect(modal.hasAttribute('open')).toBe(true);
    expect(modal.shadowRoot!.getElementById('modalName')!.textContent).toBe(
      'Instrument · Individual · Half Hour · After School',
    );
    expect(modal.shadowRoot!.querySelector('.modal__body')!.textContent).toContain('permanently removed');
  });
});

describe('pm-course-management-page — deletes on confirmation', { tags: ['258UC14'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('removes the course from the list', async () => {
    vi.mocked(deleteCourse).mockResolvedValue(undefined);
    el = await mountPage();

    clickRowAction(el, 1, 'Delete');
    await flush();
    await clickModalButton(el, 'deleteBtn');

    expect(deleteCourse).toHaveBeenCalledWith('c2');
    expect(rowTextsOf(el)).toHaveLength(1);
    expect(rowTextsOf(el)[0]).toContain('Theory');
  });
});

describe('pm-course-management-page — leaves the course alone on cancel', { tags: ['258UC15'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('closes the confirmation with the course still listed', async () => {
    el = await mountPage();

    clickRowAction(el, 1, 'Delete');
    await flush();
    await clickModalButton(el, 'cancelBtn');

    expect((deleteModalOf(el) as unknown as HTMLElement).hasAttribute('open')).toBe(false);
    expect(deleteCourse).not.toHaveBeenCalled();
    expect(rowTextsOf(el)).toHaveLength(2);
  });
});

describe('pm-course-management-page — reports a refused deletion against its row', { tags: ['258UC16'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows the reason against the row and leaves the course listed', async () => {
    vi.mocked(deleteCourse).mockRejectedValue(new CoursesError('Course c2 was not found.', 404));
    el = await mountPage();

    clickRowAction(el, 1, 'Delete');
    await flush();
    await clickModalButton(el, 'deleteBtn');

    expect(rowErrorOf(el)).toContain('was not found');
    expect(rowTextsOf(el)).toHaveLength(2);
  });
});
