import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  addSibling,
  StudentsError,
  type StudentResult,
} from '../../services/students';

const mockGetStudents = vi.fn();
vi.mock('../../services/students', async () => {
  const actual = await vi.importActual<typeof import('../../services/students')>('../../services/students');
  return {
    ...actual,
    getStudents: () => mockGetStudents(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    addSibling: vi.fn(),
  };
});

import '../pm-students-page';
import type { PmStudentsTable } from '../../components/pm-students-table';
import type { PmStudentWizardModal } from '../../components/pm-student-wizard-modal';
import type { PmDeleteStudentModal } from '../../components/pm-delete-student-modal';

const alice: StudentResult = {
  studentId: 's1',
  firstName: 'Alice',
  lastName: 'Vance',
  dateOfBirth: '2014-05-12',
  grade: 'Grade4',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
};

const julian: StudentResult = {
  studentId: 's2',
  firstName: 'Julian',
  lastName: 'Thorne',
  dateOfBirth: '2013-09-05',
  grade: 'Grade5',
  class: 'E1',
  phase: 'Senior',
  language: 'Afrikaans',
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-students-page');
  document.body.appendChild(el);
  await flush();
  return el;
}

function tableOf(el: HTMLElement): PmStudentsTable {
  return el.shadowRoot!.getElementById('studentsTable') as unknown as PmStudentsTable;
}

function wizardModalOf(el: HTMLElement): PmStudentWizardModal {
  return el.shadowRoot!.getElementById('wizardModal') as unknown as PmStudentWizardModal;
}

function studentStepMessageOf(wizard: PmStudentWizardModal): HTMLElement {
  const studentStep = wizard.shadowRoot!.getElementById('studentStep')!;
  return studentStep.shadowRoot!.getElementById('message') as HTMLElement;
}

function deleteModalOf(el: HTMLElement): PmDeleteStudentModal {
  return el.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteStudentModal;
}

beforeEach(() => {
  mockGetStudents.mockReset();
  mockGetStudents.mockImplementation(() => Promise.resolve([alice, julian]));
  vi.mocked(createStudent).mockReset();
  vi.mocked(updateStudent).mockReset();
  vi.mocked(deleteStudent).mockReset();
  vi.mocked(deleteStudent).mockResolvedValue(undefined);
  vi.mocked(addSibling).mockReset();
});

describe('pm-students-page — loads the roster on page load', { tags: ['200UC8'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('fetches and displays the current list of students', async () => {
    el = await mountPage();

    expect(mockGetStudents).toHaveBeenCalledTimes(1);
    expect(tableOf(el).students.map((s) => s.studentId)).toEqual(['s1', 's2']);
  });
});

describe(
  'pm-students-page — applies grade/phase/class/name filters client-side',
  { tags: ['200UC5', '200UC9'] },
  () => {
    let el: HTMLElement;

    beforeEach(async () => {
      el = await mountPage();
    });

    afterEach(() => {
      document.body.removeChild(el);
    });

    it('filters the already-loaded roster without re-fetching from the server', async () => {
      el.shadowRoot!.dispatchEvent(
        new CustomEvent('filter-changed', { bubbles: true, composed: true, detail: { grade: 'Grade5' } }),
      );
      await flush();

      expect(mockGetStudents).toHaveBeenCalledTimes(1);
      expect(tableOf(el).students).toEqual([julian]);
    });

    it('filters by name against the cached roster', async () => {
      el.shadowRoot!.dispatchEvent(
        new CustomEvent('filter-changed', { bubbles: true, composed: true, detail: { name: 'thorne' } }),
      );
      await flush();

      expect(mockGetStudents).toHaveBeenCalledTimes(1);
      expect(tableOf(el).students).toEqual([julian]);
    });
  },
);

describe('pm-students-page — creates a student from the wizard modal', { tags: ['200UC10'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('handling student-create-requested calls createStudent and the new student appears in the list', async () => {
    const created: StudentResult = { ...alice, studentId: 's3', firstName: 'Nadia' };
    vi.mocked(createStudent).mockResolvedValue(created);
    mockGetStudents.mockImplementation(() => Promise.resolve([alice, julian, created]));

    const input = {
      firstName: 'Nadia',
      lastName: 'Vance',
      dateOfBirth: '2014-05-12',
      grade: 'Grade4' as const,
      class: 'A1' as const,
      phase: 'Junior' as const,
      language: 'English' as const,
    };
    el.shadowRoot!.dispatchEvent(
      new CustomEvent('student-create-requested', {
        bubbles: true,
        composed: true,
        detail: { input, pendingSiblingIds: [] },
      }),
    );
    await flush();

    expect(vi.mocked(createStudent)).toHaveBeenCalledWith(input);
    expect(tableOf(el).students.map((s) => s.studentId)).toEqual(['s1', 's2', 's3']);
    expect(wizardModalOf(el).hasAttribute('open')).toBe(false);
  });

  it('adds the siblings picked during creation once the new student is saved', async () => {
    const created: StudentResult = { ...alice, studentId: 's3', firstName: 'Nadia' };
    vi.mocked(createStudent).mockResolvedValue(created);
    vi.mocked(addSibling).mockResolvedValue(alice);
    mockGetStudents.mockImplementation(() => Promise.resolve([alice, julian, created]));

    const createBtn = el.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;
    createBtn.click();

    const wizard = wizardModalOf(el);
    const wizardShadow = wizard.shadowRoot!;
    const stepShadow = wizardShadow.getElementById('studentStep')!.shadowRoot!;
    (stepShadow.getElementById('firstName') as HTMLInputElement).value = 'Nadia';
    (stepShadow.getElementById('lastName') as HTMLInputElement).value = 'Vance';
    (stepShadow.getElementById('dateOfBirth') as HTMLInputElement).value = '2014-05-12';
    (stepShadow.getElementById('grade') as HTMLSelectElement).value = 'Grade4';
    (stepShadow.getElementById('class') as HTMLSelectElement).value = 'A1';
    (stepShadow.getElementById('phase') as HTMLSelectElement).value = 'Junior';
    (stepShadow.getElementById('language') as HTMLSelectElement).value = 'English';
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();

    const searchSelectShadow = wizardShadow
      .getElementById('siblingsStep')!
      .shadowRoot!.getElementById('searchSelect')!.shadowRoot!;
    const searchQuery = searchSelectShadow.getElementById('query') as HTMLInputElement;
    searchQuery.value = alice.firstName;
    searchQuery.dispatchEvent(new Event('input'));
    const aliceResult = searchSelectShadow.querySelector<HTMLButtonElement>(
      `.search-select__result[data-student-id="${alice.studentId}"]`,
    )!;
    aliceResult.click();
    (searchSelectShadow.getElementById('addBtn') as HTMLButtonElement).click();

    (wizardShadow.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(createStudent)).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Nadia', lastName: 'Vance' }),
    );
    expect(vi.mocked(addSibling)).toHaveBeenCalledWith('s3', alice.studentId);
    expect(wizard.hasAttribute('open')).toBe(false);
  });

  it('re-enables the Save button when the wizard is reopened after a successful create', async () => {
    const created: StudentResult = { ...alice, studentId: 's3', firstName: 'Nadia' };
    vi.mocked(createStudent).mockResolvedValue(created);
    mockGetStudents.mockImplementation(() => Promise.resolve([alice, julian, created]));

    const createBtn = el.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;
    createBtn.click();

    const wizard = wizardModalOf(el);
    const wizardShadow = wizard.shadowRoot!;
    const studentStep = wizardShadow.getElementById('studentStep')!;
    const stepShadow = studentStep.shadowRoot!;
    (stepShadow.getElementById('firstName') as HTMLInputElement).value = 'Nadia';
    (stepShadow.getElementById('lastName') as HTMLInputElement).value = 'Vance';
    (stepShadow.getElementById('dateOfBirth') as HTMLInputElement).value = '2014-05-12';
    (stepShadow.getElementById('grade') as HTMLSelectElement).value = 'Grade4';
    (stepShadow.getElementById('class') as HTMLSelectElement).value = 'A1';
    (stepShadow.getElementById('phase') as HTMLSelectElement).value = 'Junior';
    (stepShadow.getElementById('language') as HTMLSelectElement).value = 'English';

    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(wizard.hasAttribute('open')).toBe(false);

    createBtn.click();

    expect((wizardShadow.getElementById('saveBtn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the createStudent error on the wizard and keeps it open when the request fails', async () => {
    vi.mocked(createStudent).mockRejectedValue(new StudentsError('First name is required', 400));

    const input = {
      firstName: '',
      lastName: 'Vance',
      dateOfBirth: '2014-05-12',
      grade: 'Grade4' as const,
      class: 'A1' as const,
      phase: 'Junior' as const,
      language: 'English' as const,
    };
    el.shadowRoot!.dispatchEvent(
      new CustomEvent('student-create-requested', {
        bubbles: true,
        composed: true,
        detail: { input, pendingSiblingIds: [] },
      }),
    );
    await flush();

    const message = studentStepMessageOf(wizardModalOf(el));
    expect(message.textContent).toBe('First name is required');
  });
});

describe('pm-students-page — updates a student from the wizard modal', { tags: ['200UC11'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('handling student-update-requested calls updateStudent and the list reflects the updated data', async () => {
    const updated: StudentResult = { ...alice, grade: 'Grade5' };
    vi.mocked(updateStudent).mockResolvedValue(updated);
    mockGetStudents.mockImplementation(() => Promise.resolve([updated, julian]));

    const input = {
      firstName: alice.firstName,
      lastName: alice.lastName,
      dateOfBirth: alice.dateOfBirth,
      grade: 'Grade5' as const,
      class: alice.class,
      phase: alice.phase,
      language: alice.language,
    };
    el.shadowRoot!.dispatchEvent(
      new CustomEvent('student-update-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: 's1', input },
      }),
    );
    await flush();

    expect(vi.mocked(updateStudent)).toHaveBeenCalledWith('s1', input);
    expect(tableOf(el).students.find((s) => s.studentId === 's1')?.grade).toBe('Grade5');
    expect(wizardModalOf(el).hasAttribute('open')).toBe(false);
  });

  it('re-enables the Save button when the wizard is reopened after a successful update', async () => {
    const updated: StudentResult = { ...alice, grade: 'Grade5' };
    vi.mocked(updateStudent).mockResolvedValue(updated);
    mockGetStudents.mockImplementation(() => Promise.resolve([updated, julian]));

    const wizard = wizardModalOf(el);
    const wizardShadow = wizard.shadowRoot!;
    wizard.openForEdit(alice);
    (wizardShadow.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(wizard.hasAttribute('open')).toBe(false);

    wizard.openForEdit(alice);

    expect((wizardShadow.getElementById('saveBtn') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('pm-students-page — removes a student on delete confirmation', { tags: ['200UC12'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('handling student-delete-confirmed calls deleteStudent and removes the row from the table', async () => {
    const modal = deleteModalOf(el);
    modal.show('s2', 'Julian Thorne');
    modal.shadowRoot!.getElementById('deleteBtn')!.click();
    await flush();

    expect(vi.mocked(deleteStudent)).toHaveBeenCalledWith('s2');
    expect(tableOf(el).students.map((s) => s.studentId)).toEqual(['s1']);
  });
});
