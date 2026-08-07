import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTeacher, type TeacherResult } from '../../services/teachers';

const mockGetTeachers = vi.fn();
const mockGetLinkableAccounts = vi.fn(() => Promise.resolve([]));
vi.mock('../../services/teachers', async () => {
  const actual = await vi.importActual<typeof import('../../services/teachers')>('../../services/teachers');
  return {
    ...actual,
    getTeachers: () => mockGetTeachers(),
    getLinkableAccounts: () => mockGetLinkableAccounts(),
    createTeacher: vi.fn(),
  };
});

import '../pm-teachers-page';
import type { PmTeacherTable } from '../../components/pm-teacher-table';
import type { PmTeacherCreateSection } from '../../components/pm-teacher-create-section';

const alice: TeacherResult = {
  teacherId: 't1',
  firstName: 'Alice',
  surname: 'Vance',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
};

const julian: TeacherResult = {
  teacherId: 't2',
  firstName: 'Julian',
  surname: 'Thorne',
  isPrivate: true,
  isActive: false,
  linkedAccountId: 'acc-1',
  linkedAccountEmail: 'linked@example.com',
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-teachers-page');
  document.body.appendChild(el);
  await flush();
  return el;
}

function tableOf(el: HTMLElement): PmTeacherTable {
  return el.shadowRoot!.getElementById('teacherTable') as unknown as PmTeacherTable;
}

function createSectionOf(el: HTMLElement): PmTeacherCreateSection {
  return el.shadowRoot!.getElementById('createSection') as unknown as PmTeacherCreateSection;
}

beforeEach(() => {
  mockGetTeachers.mockReset();
  mockGetTeachers.mockImplementation(() => Promise.resolve([alice, julian]));
  vi.mocked(createTeacher).mockReset();
});

describe('pm-teachers-page — loads the roster on page load', { tags: ['231UC7'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('fetches and displays the current list of teachers, one row per teacher with name/type/status', async () => {
    el = await mountPage();

    expect(mockGetTeachers).toHaveBeenCalledTimes(1);
    const teachers = tableOf(el).teachers;
    expect(teachers.map((t) => t.teacherId)).toEqual(['t1', 't2']);
    expect(teachers.map((t) => t.isPrivate)).toEqual([false, true]);
    expect(teachers.map((t) => t.isActive)).toEqual([true, false]);
  });
});

describe('pm-teachers-page — client-side filtering, no additional server request', { tags: ['231UC8'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('filters the already-loaded roster without re-fetching from the server', async () => {
    el.shadowRoot!.dispatchEvent(
      new CustomEvent('filter-changed', { bubbles: true, composed: true, detail: { status: 'deactivated' } }),
    );
    await flush();

    expect(mockGetTeachers).toHaveBeenCalledTimes(1);
    expect(tableOf(el).teachers).toEqual([julian]);
  });

  it('filters by type against the boolean flag', async () => {
    el.shadowRoot!.dispatchEvent(
      new CustomEvent('filter-changed', { bubbles: true, composed: true, detail: { type: 'private' } }),
    );
    await flush();

    expect(tableOf(el).teachers).toEqual([julian]);
  });
});

describe('pm-teachers-page — create section validation', { tags: ['231UC9'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows validation messages and issues no request when first name and surname are blank', () => {
    const section = createSectionOf(el);
    const shadow = section.shadowRoot!;
    (shadow.getElementById('saveBtn') as HTMLButtonElement).click();

    expect((shadow.getElementById('firstNameError') as HTMLElement).textContent).toBe('First name is required');
    expect((shadow.getElementById('surnameError') as HTMLElement).textContent).toBe('Surname is required');
    expect(vi.mocked(createTeacher)).not.toHaveBeenCalled();
  });
});

describe(
  'pm-teachers-page — the create section is permanently inline on the same screen',
  { tags: ['231UC11'] },
  () => {
    let el: HTMLElement;

    beforeEach(async () => {
      el = await mountPage();
    });

    afterEach(() => {
      document.body.removeChild(el);
    });

    it('renders the create section inline on load, with no expand control and no overlay', () => {
      const section = createSectionOf(el);

      expect(section.hidden).toBe(false);
      expect(el.shadowRoot!.getElementById('createBtn')).toBeNull();
      expect(el.shadowRoot!.querySelector('dialog')).toBeNull();
      expect(window.location.hash).not.toContain('create');
    });

    it('a valid submission calls createTeacher, clears the still-visible section, and the new teacher appears in the list', async () => {
      const created: TeacherResult = { ...alice, teacherId: 't3', firstName: 'Nadia' };
      vi.mocked(createTeacher).mockResolvedValue(created);
      mockGetTeachers.mockImplementation(() => Promise.resolve([alice, julian, created]));

      const section = createSectionOf(el);
      const shadow = section.shadowRoot!;
      (shadow.getElementById('firstName') as HTMLInputElement).value = 'Nadia';
      (shadow.getElementById('surname') as HTMLInputElement).value = 'Vance';
      (shadow.getElementById('saveBtn') as HTMLButtonElement).click();
      await flush();

      expect(vi.mocked(createTeacher)).toHaveBeenCalledWith({
        firstName: 'Nadia',
        surname: 'Vance',
        isPrivate: false,
        linkedAccountId: null,
      });
      expect(section.hidden).toBe(false);
      expect((shadow.getElementById('firstName') as HTMLInputElement).value).toBe('');
      expect((shadow.getElementById('surname') as HTMLInputElement).value).toBe('');
      expect(tableOf(el).teachers.map((t) => t.teacherId)).toEqual(['t1', 't2', 't3']);
    });
  },
);
