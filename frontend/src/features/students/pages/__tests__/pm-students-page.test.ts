import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  addSibling,
  getSiblings,
  StudentsError,
  type StudentResult,
} from '../../services/students';
import {
  getGuardians,
  addGuardian,
  updateGuardian,
  unlinkGuardian,
  deleteGuardian,
  isGuardianShared,
  syncGuardians,
  getMissingSiblingGuardians,
  peekCachedGuardianRelationships,
  type GuardianResult,
} from '../../services/guardians';

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
    getSiblings: vi.fn(),
  };
});

const mockGetGuardianRelationships = vi.fn();
vi.mock('../../services/guardians', async () => {
  const actual = await vi.importActual<typeof import('../../services/guardians')>('../../services/guardians');
  return {
    ...actual,
    getGuardians: vi.fn(),
    addGuardian: vi.fn(),
    updateGuardian: vi.fn(),
    unlinkGuardian: vi.fn(),
    deleteGuardian: vi.fn(),
    isGuardianShared: vi.fn(),
    syncGuardians: vi.fn(),
    getMissingSiblingGuardians: vi.fn(),
    getGuardianRelationships: () => mockGetGuardianRelationships(),
    // Mocked separately from the real cache the (also mocked) getGuardianRelationships
    // would otherwise populate — tests set this directly to control which branch of
    // pm-students-page's cache-peek-then-open logic runs.
    peekCachedGuardianRelationships: vi.fn(),
  };
});

vi.mock('../../services/enrollments', async () => {
  const actual = await vi.importActual<typeof import('../../services/enrollments')>('../../services/enrollments');
  return {
    ...actual,
    getStudentCourses: vi.fn(),
    enrollStudent: vi.fn(),
    getEnrollableCourses: vi.fn(),
    getAssignableTeachers: vi.fn(),
  };
});

import {
  getStudentCourses,
  enrollStudent,
  getEnrollableCourses,
  getAssignableTeachers,
  type AssignableTeacher,
  type EnrollableCourse,
  type EnrollmentResult,
} from '../../services/enrollments';

import '../pm-students-page';
import type { PmStudentsTable } from '../../components/pm-students-table';
import type { PmStudentWizardModal } from '../../components/pm-student-wizard-modal';
import type { PmDeleteStudentModal } from '../../components/pm-delete-student-modal';
import type { PmDeleteGuardianModal } from '../../components/pm-delete-guardian-modal';
import type { PmGuardianList } from '../../components/pm-guardian-list';
import type { PmStudentGuardiansSummary } from '../../components/pm-student-guardians-summary';
import type { PmStudentCoursesSummary } from '../../components/pm-student-courses-summary';
import type { PmEnrollmentList } from '../../components/pm-enrollment-list';

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

const motherRelationship = { guardianRelationshipId: 'gr1', name: 'Mother' };
const fatherRelationship = { guardianRelationshipId: 'gr2', name: 'Father' };

const nomvula: GuardianResult = {
  guardianId: 'g1',
  guardianRelationshipId: 'gr1',
  firstName: 'Nomvula',
  surname: 'Dube',
  cell: '0821234567',
  email: 'nomvula@example.com',
  receivesCorrespondence: true,
  responsibleForPayment: true,
  married: false,
};

const pianoCourse: EnrollableCourse = {
  courseId: 'c1',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const recorderCourse: EnrollableCourse = {
  courseId: 'c2',
  courseType: 'G2Recorder',
  lessonType: 'Group',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const dawid: AssignableTeacher = { teacherId: 't1', firstName: 'Dawid', surname: 'van Zyl', isActive: true };

const pianoEnrollment: EnrollmentResult = {
  studentCourseId: 'sc1',
  studentId: 's1',
  courseId: 'c1',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
  teacherId: 't1',
  teacherFirstName: 'Dawid',
  teacherSurname: 'van Zyl',
  instrumentType: 'Piano',
  stepType: 'Step2A',
  enrolledDate: '2026-01-19',
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

function deleteGuardianModalOf(el: HTMLElement): PmDeleteGuardianModal {
  return el.shadowRoot!.getElementById('deleteGuardianModal') as unknown as PmDeleteGuardianModal;
}

function guardiansStepShadowOf(wizard: PmStudentWizardModal): ShadowRoot {
  return wizard.shadowRoot!.getElementById('guardiansStep')!.shadowRoot!;
}

function coursesStepShadowOf(wizard: PmStudentWizardModal): ShadowRoot {
  return wizard.shadowRoot!.getElementById('coursesStep')!.shadowRoot!;
}

/** Fills the Student tab with a valid new student, as every create flow must. */
function fillStudentStep(wizard: PmStudentWizardModal): void {
  const stepShadow = wizard.shadowRoot!.getElementById('studentStep')!.shadowRoot!;
  (stepShadow.getElementById('firstName') as HTMLInputElement).value = 'Nadia';
  (stepShadow.getElementById('lastName') as HTMLInputElement).value = 'Vance';
  (stepShadow.getElementById('dateOfBirth') as HTMLInputElement).value = '2014-05-12';
  (stepShadow.getElementById('grade') as HTMLSelectElement).value = 'Grade4';
  (stepShadow.getElementById('class') as HTMLSelectElement).value = 'A1';
  (stepShadow.getElementById('phase') as HTMLSelectElement).value = 'Junior';
  (stepShadow.getElementById('language') as HTMLSelectElement).value = 'English';
}

/** Opens the enroll panel on the Courses tab and confirms it, staging or submitting one enrollment. */
function enrollViaForm(wizard: PmStudentWizardModal, courseId: string, teacherId: string): void {
  const coursesShadow = coursesStepShadowOf(wizard);
  (coursesShadow.getElementById('enrollBtn') as HTMLButtonElement).click();

  const formShadow = coursesShadow.getElementById('enrollmentForm')!.shadowRoot!;
  const courseSelect = formShadow.getElementById('course') as HTMLSelectElement;
  courseSelect.value = courseId;
  courseSelect.dispatchEvent(new Event('change'));
  (formShadow.getElementById('teacher') as HTMLSelectElement).value = teacherId;
  (formShadow.getElementById('confirmBtn') as HTMLButtonElement).click();
}

beforeEach(() => {
  mockGetStudents.mockReset();
  mockGetStudents.mockImplementation(() => Promise.resolve([alice, julian]));
  vi.mocked(createStudent).mockReset();
  vi.mocked(updateStudent).mockReset();
  vi.mocked(deleteStudent).mockReset();
  vi.mocked(deleteStudent).mockResolvedValue(undefined);
  vi.mocked(addSibling).mockReset();
  vi.mocked(getSiblings).mockReset();
  vi.mocked(getSiblings).mockResolvedValue([]);
  mockGetGuardianRelationships.mockReset();
  mockGetGuardianRelationships.mockResolvedValue([motherRelationship, fatherRelationship]);
  vi.mocked(getGuardians).mockReset();
  vi.mocked(getGuardians).mockResolvedValue([]);
  vi.mocked(addGuardian).mockReset();
  vi.mocked(updateGuardian).mockReset();
  vi.mocked(unlinkGuardian).mockReset();
  vi.mocked(unlinkGuardian).mockResolvedValue(undefined);
  vi.mocked(deleteGuardian).mockReset();
  vi.mocked(deleteGuardian).mockResolvedValue(undefined);
  vi.mocked(isGuardianShared).mockReset();
  vi.mocked(isGuardianShared).mockResolvedValue(false);
  vi.mocked(syncGuardians).mockReset();
  vi.mocked(getMissingSiblingGuardians).mockReset();
  vi.mocked(getMissingSiblingGuardians).mockResolvedValue([]);
  // Simulates the realistic common case: the cache is already warm by the time a
  // test opens the wizard, exactly as it would be in the real app after the page's
  // eager on-mount load resolves. Tests for the cold-cache fallback override this.
  vi.mocked(peekCachedGuardianRelationships).mockReset();
  vi.mocked(peekCachedGuardianRelationships).mockReturnValue([motherRelationship, fatherRelationship]);
  vi.mocked(getStudentCourses).mockReset();
  vi.mocked(getStudentCourses).mockResolvedValue([]);
  vi.mocked(enrollStudent).mockReset();
  vi.mocked(enrollStudent).mockResolvedValue(pianoEnrollment);
  vi.mocked(getEnrollableCourses).mockReset();
  vi.mocked(getEnrollableCourses).mockResolvedValue([pianoCourse, recorderCourse]);
  vi.mocked(getAssignableTeachers).mockReset();
  vi.mocked(getAssignableTeachers).mockResolvedValue([dawid]);
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
    fillStudentStep(wizard);
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

    // A student cannot be saved without at least one course, so the create flow
    // stages one before Save is offered.
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    enrollViaForm(wizard, recorderCourse.courseId, dawid.teacherId);

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
    fillStudentStep(wizard);

    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    enrollViaForm(wizard, recorderCourse.courseId, dawid.teacherId);
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
    (wizardShadow.getElementById('studentSaveBtn') as HTMLButtonElement).click();
    await flush();

    expect(wizard.hasAttribute('open')).toBe(false);

    wizard.openForEdit(alice);

    expect((wizardShadow.getElementById('studentSaveBtn') as HTMLButtonElement).disabled).toBe(false);
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

describe('pm-students-page — Guardians tab shows the student linked guardians', { tags: ['212UC14'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('opening the Guardians tab fetches and displays the linked guardians', async () => {
    vi.mocked(getGuardians).mockResolvedValue([nomvula]);

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(getGuardians)).toHaveBeenCalledWith('s1');
    const guardianList = guardiansStepShadowOf(wizard).getElementById('guardianList') as unknown as PmGuardianList;
    expect(guardianList.guardians.map((g) => g.guardianId)).toEqual(['g1']);
  });
});

describe('pm-students-page — adds a guardian from the Guardians tab', { tags: ['212UC15'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('submitting the Add Guardian form calls addGuardian and the new guardian appears in the list', async () => {
    vi.mocked(getGuardians).mockReset();
    vi.mocked(getGuardians).mockResolvedValueOnce([]).mockResolvedValueOnce([nomvula]);
    vi.mocked(addGuardian).mockResolvedValue(nomvula);

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    (guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement).click();

    const formShadow = guardiansStepShadow.getElementById('guardianForm')!.shadowRoot!;
    (formShadow.getElementById('firstName') as HTMLInputElement).value = 'Nomvula';
    (formShadow.getElementById('surname') as HTMLInputElement).value = 'Dube';
    (formShadow.getElementById('relationship') as HTMLSelectElement).value = 'gr1';
    (formShadow.getElementById('cell') as HTMLInputElement).value = '0821234567';
    (formShadow.getElementById('email') as HTMLInputElement).value = 'nomvula@example.com';
    (formShadow.getElementById('receivesCorrespondence') as HTMLInputElement).checked = true;
    (formShadow.getElementById('responsibleForPayment') as HTMLInputElement).checked = true;
    (formShadow.getElementById('confirmBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(addGuardian)).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ firstName: 'Nomvula', surname: 'Dube', guardianRelationshipId: 'gr1' }),
    );
    const guardianList = guardiansStepShadow.getElementById('guardianList') as unknown as PmGuardianList;
    expect(guardianList.guardians.map((g) => g.guardianId)).toEqual(['g1']);

    const formPanel = guardiansStepShadow.getElementById('formPanel') as HTMLElement;
    expect(formPanel.classList.contains('guardians-step__form-panel--expanded')).toBe(false);
    expect((guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement).hidden).toBe(false);
  });

  it('does not collapse a form the user has already opened when a slower, unrelated tab-activation refresh resolves late', async () => {
    // Simulates the real race this guards against: the tab-activation fetch is still
    // in flight when the user clicks Add, and only resolves afterwards.
    let resolveTabActivationFetch!: (guardians: GuardianResult[]) => void;
    vi.mocked(getGuardians).mockReset();
    vi.mocked(getGuardians).mockReturnValueOnce(new Promise((resolve) => (resolveTabActivationFetch = resolve)));

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    (guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement).click();
    const formPanel = guardiansStepShadow.getElementById('formPanel') as HTMLElement;
    expect(formPanel.classList.contains('guardians-step__form-panel--expanded')).toBe(true);

    resolveTabActivationFetch([]);
    await flush();

    expect(formPanel.classList.contains('guardians-step__form-panel--expanded')).toBe(true);
  });

  it('expands the Add Guardian form under the button with the list still visible, and collapses on Cancel', async () => {
    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    const formPanel = guardiansStepShadow.getElementById('formPanel') as HTMLElement;
    const guardianListEl = guardiansStepShadow.getElementById('guardianList') as HTMLElement;
    const addBtn = guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement;
    const confirmBtn = guardiansStepShadow
      .getElementById('guardianForm')!
      .shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement;

    expect(formPanel.classList.contains('guardians-step__form-panel--expanded')).toBe(false);
    expect(formPanel.hasAttribute('inert')).toBe(true);
    expect(addBtn.hidden).toBe(false);

    addBtn.click();

    expect(formPanel.classList.contains('guardians-step__form-panel--expanded')).toBe(true);
    expect(formPanel.hasAttribute('inert')).toBe(false);
    expect(guardianListEl.hidden).toBe(false);
    expect(confirmBtn.textContent).toBe('Add');
    expect(addBtn.hidden).toBe(true);

    (
      guardiansStepShadow.getElementById('guardianForm')!.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement
    ).click();

    expect(formPanel.classList.contains('guardians-step__form-panel--expanded')).toBe(false);
    expect(formPanel.hasAttribute('inert')).toBe(true);
    expect(addBtn.hidden).toBe(false);
  });
});

describe('pm-students-page — edits a guardian from the Guardians tab', { tags: ['212UC16'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('editing a guardian inline on its table row calls updateGuardian and the list reflects the updated details', async () => {
    const updated = { ...nomvula, surname: 'Khumalo' };
    vi.mocked(getGuardians).mockReset();
    vi.mocked(getGuardians).mockResolvedValueOnce([nomvula]).mockResolvedValueOnce([updated]);
    vi.mocked(updateGuardian).mockResolvedValue(updated);

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    const addBtn = guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement;
    const guardianListShadow = guardiansStepShadow.getElementById('guardianList')!.shadowRoot!;
    // Edit mode: guardians are already persisted, so the row uses "Edit"/"Delete", not "Change"/"Remove".
    expect(guardianListShadow.querySelector('.guardian-list__btn--edit')?.textContent).toBe('Edit');
    expect(guardianListShadow.querySelector('.guardian-list__btn--change')).toBeNull();
    (guardianListShadow.querySelector('.guardian-list__btn--edit') as HTMLButtonElement).click();

    expect(addBtn.hidden).toBe(true);

    const row = guardianListShadow.querySelector('tbody tr')!;
    const [firstNameInput, surnameInput] = row.querySelectorAll(
      '.guardian-list__edit-name input',
    ) as NodeListOf<HTMLInputElement>;
    expect(firstNameInput.value).toBe('Nomvula');
    surnameInput.value = 'Khumalo';
    (row.querySelector('.guardian-list__btn--save') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(updateGuardian)).toHaveBeenCalledWith('g1', expect.objectContaining({ surname: 'Khumalo' }));
    const guardianList = guardiansStepShadow.getElementById('guardianList') as unknown as PmGuardianList;
    expect(guardianList.guardians[0]?.surname).toBe('Khumalo');
    expect(addBtn.hidden).toBe(false);
  });

  it('cancelling an inline edit discards the row changes and restores the Add Guardian button', async () => {
    vi.mocked(getGuardians).mockReset();
    vi.mocked(getGuardians).mockResolvedValue([nomvula]);

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    const addBtn = guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement;
    const guardianListShadow = guardiansStepShadow.getElementById('guardianList')!.shadowRoot!;
    // Edit mode: guardians are already persisted, so the row uses "Edit"/"Delete", not "Change"/"Remove".
    expect(guardianListShadow.querySelector('.guardian-list__btn--edit')?.textContent).toBe('Edit');
    expect(guardianListShadow.querySelector('.guardian-list__btn--change')).toBeNull();
    (guardianListShadow.querySelector('.guardian-list__btn--edit') as HTMLButtonElement).click();

    expect(addBtn.hidden).toBe(true);

    const row = guardianListShadow.querySelector('tbody tr')!;
    (row.querySelector('.guardian-list__btn--cancel') as HTMLButtonElement).click();

    expect(vi.mocked(updateGuardian)).not.toHaveBeenCalled();
    expect(addBtn.hidden).toBe(false);
    expect(guardianListShadow.querySelector('.guardian-list__btn--edit')).not.toBeNull();
  });
});

describe('pm-students-page — scoped guardian delete from the Guardians tab', { tags: ['212UC17'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('offers a scoped choice when the guardian is actually shared, and "this student only" calls unlinkGuardian not deleteGuardian', async () => {
    vi.mocked(isGuardianShared).mockResolvedValue(true);
    vi.mocked(getGuardians).mockReset();
    vi.mocked(getGuardians)
      .mockResolvedValueOnce([nomvula]) // own guardians, tab activation
      .mockResolvedValueOnce([]); // own guardians, post-unlink refresh

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    const guardianListShadow = guardiansStepShadow.getElementById('guardianList')!.shadowRoot!;
    (guardianListShadow.querySelector('.guardian-list__btn--delete') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(isGuardianShared)).toHaveBeenCalledWith('g1');
    const deleteModal = deleteGuardianModalOf(el);
    const modalShadow = deleteModal.shadowRoot!;
    expect((modalShadow.getElementById('scopeChoice') as HTMLElement).hidden).toBe(false);
    expect((modalShadow.getElementById('plainBody') as HTMLElement).hidden).toBe(true);

    (modalShadow.getElementById('scopeOne') as HTMLInputElement).checked = true;
    (modalShadow.getElementById('deleteBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(unlinkGuardian)).toHaveBeenCalledWith('s1', 'g1');
    expect(vi.mocked(deleteGuardian)).not.toHaveBeenCalled();
    const guardianList = guardiansStepShadow.getElementById('guardianList') as unknown as PmGuardianList;
    expect(guardianList.guardians).toEqual([]);
  });

  it('shows the plain delete message when the student has siblings but this guardian is not actually shared', async () => {
    // Regression guard: the student having siblings at all used to be treated as
    // "maybe shared", showing the scoped choice regardless of whether this specific
    // guardian was actually linked to any of them. The check must now be definitive.
    vi.mocked(getSiblings).mockResolvedValue([julian]);
    vi.mocked(isGuardianShared).mockResolvedValue(false);
    vi.mocked(getGuardians).mockResolvedValue([nomvula]);

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    const guardianListShadow = guardiansStepShadow.getElementById('guardianList')!.shadowRoot!;
    (guardianListShadow.querySelector('.guardian-list__btn--delete') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(isGuardianShared)).toHaveBeenCalledWith('g1');
    const deleteModal = deleteGuardianModalOf(el);
    const modalShadow = deleteModal.shadowRoot!;
    expect((modalShadow.getElementById('plainBody') as HTMLElement).hidden).toBe(false);
    expect((modalShadow.getElementById('scopeChoice') as HTMLElement).hidden).toBe(true);
  });
});

describe(
  'pm-students-page — Sync Guardians for a student missing sibling-group guardians',
  { tags: ['212UC18'] },
  () => {
    let el: HTMLElement;

    beforeEach(async () => {
      el = await mountPage();
    });

    afterEach(() => {
      document.body.removeChild(el);
    });

    it('shows Sync Guardians when a sibling holds a missing guardian, and clicking it links the missing guardian', async () => {
      vi.mocked(getSiblings).mockResolvedValue([julian]);
      vi.mocked(getGuardians).mockReset();
      vi.mocked(getGuardians)
        .mockResolvedValueOnce([]) // own guardians, tab activation
        .mockResolvedValueOnce([nomvula]); // own guardians, post-sync refresh
      vi.mocked(getMissingSiblingGuardians).mockReset();
      vi.mocked(getMissingSiblingGuardians)
        .mockResolvedValueOnce([nomvula]) // tab activation: nomvula is missing
        .mockResolvedValueOnce([]); // post-sync refresh: no longer missing
      vi.mocked(syncGuardians).mockResolvedValue([nomvula]);

      const wizard = wizardModalOf(el);
      wizard.openForEdit(alice);
      const wizardShadow = wizard.shadowRoot!;
      (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
      await flush();

      const guardiansStepShadow = guardiansStepShadowOf(wizard);
      const syncBtn = guardiansStepShadow.getElementById('syncBtn') as HTMLButtonElement;
      const addBtn = guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement;
      expect(syncBtn.hidden).toBe(false);
      expect(syncBtn.compareDocumentPosition(addBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      addBtn.click();
      expect(addBtn.hidden).toBe(true);
      expect(syncBtn.hidden).toBe(true);
      (
        guardiansStepShadow.getElementById('guardianForm')!.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement
      ).click();
      expect(addBtn.hidden).toBe(false);
      expect(syncBtn.hidden).toBe(false);

      syncBtn.click();
      await flush();

      expect(vi.mocked(syncGuardians)).toHaveBeenCalledWith('s1');
      expect(vi.mocked(getMissingSiblingGuardians)).toHaveBeenCalledWith('s1');
      const guardianList = guardiansStepShadow.getElementById('guardianList') as unknown as PmGuardianList;
      expect(guardianList.guardians.map((g) => g.guardianId)).toEqual(['g1']);
      expect(syncBtn.hidden).toBe(true);
    });
  },
);

describe('pm-students-page — Add Guardian relationship dropdown sourced from the lookup', { tags: ['212UC19'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('populates the relationship select with the guardian relationships returned by the service', async () => {
    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    const wizardShadow = wizard.shadowRoot!;
    (wizardShadow.getElementById('tabGuardians') as HTMLButtonElement).click();
    await flush();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    (guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement).click();

    const select = guardiansStepShadow
      .getElementById('guardianForm')!
      .shadowRoot!.getElementById('relationship') as HTMLSelectElement;
    const options = Array.from(select.options).filter((o) => o.value !== '');

    expect(options.map((o) => o.value)).toEqual(['gr1', 'gr2']);
    expect(options.map((o) => o.textContent)).toEqual(['Mother', 'Father']);
  });

  it('falls back to fetching relationships before opening the wizard when the cache is cold', async () => {
    vi.mocked(peekCachedGuardianRelationships).mockReturnValue(null);
    mockGetGuardianRelationships.mockReset();
    mockGetGuardianRelationships.mockResolvedValue([motherRelationship, fatherRelationship]);

    const createBtn = el.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;
    createBtn.click();
    await flush();

    const wizard = wizardModalOf(el);
    expect(wizard.hasAttribute('open')).toBe(true);
    expect(mockGetGuardianRelationships).toHaveBeenCalled();

    const guardiansStepShadow = guardiansStepShadowOf(wizard);
    (guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement).click();
    const select = guardiansStepShadow
      .getElementById('guardianForm')!
      .shadowRoot!.getElementById('relationship') as HTMLSelectElement;
    const options = Array.from(select.options).filter((o) => o.value !== '');
    expect(options.map((o) => o.textContent)).toEqual(['Mother', 'Father']);
  });
});

describe('pm-students-page — expanded row shows a read-only guardian summary', { tags: ['212UC20'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('expanding a student row fetches and displays that student linked guardians', async () => {
    vi.mocked(getGuardians).mockResolvedValue([nomvula]);

    const tableShadow = (el.shadowRoot!.getElementById('studentsTable') as unknown as PmStudentsTable).shadowRoot!;
    const chevron = tableShadow.querySelector('.students-table__chevron-btn') as HTMLButtonElement;
    chevron.click();
    await flush();

    const summary = tableShadow.querySelector('pm-student-guardians-summary') as PmStudentGuardiansSummary;
    expect(summary.guardians.map((g) => g.guardianId)).toEqual(['g1']);
  });
});

describe(
  'pm-students-page — Create wizard Guardians step prepopulates siblings guardians read-only',
  { tags: ['212UC21'] },
  () => {
    let el: HTMLElement;

    beforeEach(async () => {
      el = await mountPage();
    });

    afterEach(() => {
      document.body.removeChild(el);
    });

    it('entering the Guardians step after picking a sibling shows that sibling guardians as read-only rows', async () => {
      vi.mocked(getGuardians).mockResolvedValue([nomvula]);

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
      searchQuery.value = julian.firstName;
      searchQuery.dispatchEvent(new Event('input'));
      const julianResult = searchSelectShadow.querySelector<HTMLButtonElement>(
        `.search-select__result[data-student-id="${julian.studentId}"]`,
      )!;
      julianResult.click();
      (searchSelectShadow.getElementById('addBtn') as HTMLButtonElement).click();

      (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
      await flush();

      expect(vi.mocked(getGuardians)).toHaveBeenCalledWith(julian.studentId);

      const guardiansStepShadow = guardiansStepShadowOf(wizard);
      const guardianList = guardiansStepShadow.getElementById('guardianList') as unknown as PmGuardianList;
      expect(guardianList.guardians.map((g) => g.guardianId)).toEqual(['g1']);
      expect(guardianList.guardians.every((g) => g.readOnly)).toBe(true);

      const guardianListShadow = guardiansStepShadow.getElementById('guardianList')!.shadowRoot!;
      expect(guardianListShadow.querySelector('.guardian-list__btn--edit')).toBeNull();
      expect(guardianListShadow.querySelector('.guardian-list__btn--delete')).toBeNull();

      const addBtn = guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement;
      expect(addBtn.hidden).toBe(false);

      // Only a single guardian list element exists — inherited and own guardians share it.
      expect((guardiansStepShadow.getElementById('guardianList') as HTMLElement).hidden).toBe(false);
    });

    it('shows the own-guardians table once a new guardian is added alongside the inherited ones', async () => {
      vi.mocked(getGuardians).mockResolvedValue([nomvula]);

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
      searchQuery.value = julian.firstName;
      searchQuery.dispatchEvent(new Event('input'));
      searchSelectShadow
        .querySelector<HTMLButtonElement>(`.search-select__result[data-student-id="${julian.studentId}"]`)!
        .click();
      (searchSelectShadow.getElementById('addBtn') as HTMLButtonElement).click();

      (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
      await flush();

      const guardiansStepShadow = guardiansStepShadowOf(wizard);
      (guardiansStepShadow.getElementById('addBtn') as HTMLButtonElement).click();
      const formShadow = guardiansStepShadow.getElementById('guardianForm')!.shadowRoot!;
      (formShadow.getElementById('firstName') as HTMLInputElement).value = 'Newly';
      (formShadow.getElementById('surname') as HTMLInputElement).value = 'Added';
      (formShadow.getElementById('relationship') as HTMLSelectElement).value = 'gr1';
      (formShadow.getElementById('confirmBtn') as HTMLButtonElement).click();

      expect((guardiansStepShadow.getElementById('guardianList') as HTMLElement).hidden).toBe(false);
      const guardianList = guardiansStepShadow.getElementById('guardianList') as unknown as PmGuardianList;
      expect(guardianList.guardians.map((g) => g.firstName)).toEqual(['Nomvula', 'Newly']);
      expect(guardianList.guardians.map((g) => g.readOnly ?? false)).toEqual([true, false]);

      // Create mode: the pending own guardian is only staged in memory, so its row
      // uses "Change"/"Remove" (borderless) rather than the persisted "Edit"/"Delete".
      const guardianListShadow = guardiansStepShadow.getElementById('guardianList')!.shadowRoot!;
      const ownRow = [...guardianListShadow.querySelectorAll('tbody tr')].find((row) =>
        row.textContent!.includes('Newly'),
      )!;
      expect(ownRow.querySelector('.guardian-list__btn--change')?.textContent).toBe('Change');
      expect(ownRow.querySelector('.guardian-list__btn--remove')?.textContent).toBe('Remove');
      expect(ownRow.querySelector('.guardian-list__btn--edit')).toBeNull();
      expect(ownRow.querySelector('.guardian-list__btn--delete')).toBeNull();
    });
  },
);

describe('pm-students-page — enrolls a student from the Courses tab', { tags: ['268UC18'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('submits the enrollment, closes the panel and shows the new row in the list', async () => {
    vi.mocked(getStudentCourses).mockReset();
    vi.mocked(getStudentCourses).mockResolvedValueOnce([]).mockResolvedValueOnce([pianoEnrollment]);

    const wizard = wizardModalOf(el);
    wizard.openForEdit(alice);
    (wizard.shadowRoot!.getElementById('tabCourses') as HTMLButtonElement).click();
    await flush();

    const coursesShadow = coursesStepShadowOf(wizard);
    (coursesShadow.getElementById('enrollBtn') as HTMLButtonElement).click();
    const formShadow = coursesShadow.getElementById('enrollmentForm')!.shadowRoot!;
    const courseSelect = formShadow.getElementById('course') as HTMLSelectElement;
    courseSelect.value = pianoCourse.courseId;
    courseSelect.dispatchEvent(new Event('change'));
    (formShadow.getElementById('teacher') as HTMLSelectElement).value = dawid.teacherId;
    (formShadow.getElementById('instrument') as HTMLSelectElement).value = 'Piano';
    (formShadow.getElementById('step') as HTMLSelectElement).value = 'Step2A';
    (formShadow.getElementById('confirmBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(enrollStudent)).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        courseId: pianoCourse.courseId,
        teacherId: dawid.teacherId,
        instrumentType: 'Piano',
        stepType: 'Step2A',
      }),
    );

    const list = coursesShadow.getElementById('enrollmentList') as unknown as PmEnrollmentList;
    expect(list.enrollments.map((e) => e.studentCourseId)).toEqual(['sc1']);

    const formPanel = coursesShadow.getElementById('formPanel') as HTMLElement;
    expect(formPanel.classList.contains('courses-step__form-panel--expanded')).toBe(false);
    expect((coursesShadow.getElementById('enrollBtn') as HTMLButtonElement).hidden).toBe(false);
  });
});

describe('pm-students-page — a student cannot be saved with no course', { tags: ['268UC22'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('refuses the save, states the requirement on the Courses tab, and creates nothing', async () => {
    (el.shadowRoot!.getElementById('createBtn') as HTMLButtonElement).click();

    const wizard = wizardModalOf(el);
    const wizardShadow = wizard.shadowRoot!;
    fillStudentStep(wizard);
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();

    (wizardShadow.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(createStudent)).not.toHaveBeenCalled();
    expect(wizard.hasAttribute('open')).toBe(true);
    expect((coursesStepShadowOf(wizard).getElementById('message') as HTMLElement).textContent).toBe(
      'A student must be enrolled in at least one course before they can be saved.',
    );
  });
});

describe('pm-students-page — creates the staged enrollments once the student exists', { tags: ['268UC23'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('creates each staged enrollment against the newly created student', async () => {
    const created: StudentResult = { ...alice, studentId: 's3', firstName: 'Nadia' };
    vi.mocked(createStudent).mockResolvedValue(created);
    mockGetStudents.mockImplementation(() => Promise.resolve([alice, julian, created]));

    (el.shadowRoot!.getElementById('createBtn') as HTMLButtonElement).click();

    const wizard = wizardModalOf(el);
    const wizardShadow = wizard.shadowRoot!;
    fillStudentStep(wizard);
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();
    (wizardShadow.getElementById('nextBtn') as HTMLButtonElement).click();

    enrollViaForm(wizard, recorderCourse.courseId, dawid.teacherId);
    // Nothing is sent while the wizard is still open.
    expect(vi.mocked(enrollStudent)).not.toHaveBeenCalled();

    (wizardShadow.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(createStudent)).toHaveBeenCalled();
    expect(vi.mocked(enrollStudent)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(enrollStudent)).toHaveBeenCalledWith(
      's3',
      expect.objectContaining({ courseId: recorderCourse.courseId, teacherId: dawid.teacherId }),
    );
  });
});

describe('pm-students-page — expanded row shows a read-only courses summary', { tags: ['268UC26'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('fetches the enrollments and shows them beneath the siblings and guardians summaries', async () => {
    vi.mocked(getStudentCourses).mockResolvedValue([pianoEnrollment]);

    const tableShadow = (el.shadowRoot!.getElementById('studentsTable') as unknown as PmStudentsTable).shadowRoot!;
    (tableShadow.querySelector('.students-table__chevron-btn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(getStudentCourses)).toHaveBeenCalledWith('s1');
    const wrapper = tableShadow.querySelector('.students-table__summary-wrapper')!;
    expect([...wrapper.children].map((child) => child.tagName.toLowerCase())).toEqual([
      'pm-student-siblings-summary',
      'pm-student-guardians-summary',
      'pm-student-courses-summary',
    ]);

    const summary = tableShadow.querySelector('pm-student-courses-summary') as PmStudentCoursesSummary;
    expect(summary.enrollments.map((e) => e.studentCourseId)).toEqual(['sc1']);
  });
});
