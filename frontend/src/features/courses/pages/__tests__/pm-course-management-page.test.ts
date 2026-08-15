import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoursesError, createCourse, type Course, type LessonStructure } from '../../services/courses';

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
  const rows = tableOf(el).shadowRoot!.querySelectorAll('tbody tr');
  return [...rows].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? ''));
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

    expect(rowTextsOf(el)).toEqual([['Instrument', 'Individual · Half Hour', 'After School', 'R 450.50', '']]);
    expect(mockGetCourses.mock.calls.length).toBe(readsOnLoad);
  });

  it('combines a lesson type, duration and occurrence selection', async () => {
    el = await mountPage();

    await changeFilter(el, 'lessonType', 'Group');
    await changeFilter(el, 'durationType', 'Hour');
    await changeFilter(el, 'occurrenceType', 'DuringSchool');

    expect(rowTextsOf(el)).toEqual([['Theory', 'Group · Hour', 'During School', 'R 120.00', '']]);
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
