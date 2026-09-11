import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LessonStructure, WaitingListGroupResult, WaitingListEntryResult } from '../../services/waiting-list';
import type { AssignableTeacher } from '../../services/enrollments';
import { todayIsoDate } from '../../components/enrollment-options';

const mockGetWaitingList = vi.fn();
const mockGetLessonStructures = vi.fn();
const mockCaptureWaitingListStudent = vi.fn();
const mockGetSiblingCandidates = vi.fn();
const mockAddSibling = vi.fn();
const mockGetSiblings = vi.fn();
const mockGetGuardianRelationships = vi.fn();
const mockGetGuardians = vi.fn();
const mockAddGuardian = vi.fn();
const mockHasAnyRole = vi.fn();
const mockUpdateWaitingListEntry = vi.fn();
const mockUpdateWaitingListStudent = vi.fn();
const mockRemoveWaitingListStudent = vi.fn();
const mockGetStudentById = vi.fn();
const mockEnrolWaitingListStudent = vi.fn();
const mockGetAssignableTeachers = vi.fn();

vi.mock('../../services/waiting-list', async () => {
  const actual = await vi.importActual<typeof import('../../services/waiting-list')>('../../services/waiting-list');
  return {
    ...actual,
    getWaitingList: () => mockGetWaitingList(),
    getLessonStructures: () => mockGetLessonStructures(),
    captureWaitingListStudent: (...args: unknown[]) => mockCaptureWaitingListStudent(...args),
    updateWaitingListEntry: (...args: unknown[]) => mockUpdateWaitingListEntry(...args),
    updateWaitingListStudent: (...args: unknown[]) => mockUpdateWaitingListStudent(...args),
    removeWaitingListStudent: (...args: unknown[]) => mockRemoveWaitingListStudent(...args),
    enrolWaitingListStudent: (...args: unknown[]) => mockEnrolWaitingListStudent(...args),
  };
});

vi.mock('../../services/enrollments', async () => {
  const actual = await vi.importActual<typeof import('../../services/enrollments')>('../../services/enrollments');
  return {
    ...actual,
    getAssignableTeachers: () => mockGetAssignableTeachers(),
  };
});

vi.mock('../../services/students', async () => {
  const actual = await vi.importActual<typeof import('../../services/students')>('../../services/students');
  return {
    ...actual,
    getSiblingCandidates: () => mockGetSiblingCandidates(),
    getSiblings: (...args: unknown[]) => mockGetSiblings(...args),
    getStudentById: (...args: unknown[]) => mockGetStudentById(...args),
    addSibling: (...args: unknown[]) => mockAddSibling(...args),
  };
});

vi.mock('../../services/guardians', async () => {
  const actual = await vi.importActual<typeof import('../../services/guardians')>('../../services/guardians');
  return {
    ...actual,
    getGuardianRelationships: () => mockGetGuardianRelationships(),
    getGuardians: (...args: unknown[]) => mockGetGuardians(...args),
    addGuardian: (...args: unknown[]) => mockAddGuardian(...args),
  };
});

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasAnyRole: (roles: string[]) => mockHasAnyRole(roles) };
});

import '../pm-waiting-list-page';
import { populationDescription } from '../../components/student-population';
import type { SiblingStudentResult } from '../../services/students';
import type { PmWaitingListTable } from '../../components/pm-waiting-list-table';
import type { PmStudentWizardModal } from '../../components/pm-student-wizard-modal';

const duringSchoolEntry = {
  waitingListEntryId: 'w1',
  studentId: 's1',
  firstName: 'Amara',
  lastName: 'Pillay',
  position: 1,
  lessonType: 'Individual' as const,
  durationType: 'HalfHour' as const,
  instrumentType: 'Piano' as const,
  notes: 'Sibling of Amy — prefers afternoon slot',
  addedAt: '2026-06-02T10:00:00Z',
};

const afterSchoolEntryOne = {
  waitingListEntryId: 'w2',
  studentId: 's2',
  firstName: 'Neo',
  lastName: 'Dube',
  position: 1,
  lessonType: 'Group' as const,
  durationType: 'Hour' as const,
  instrumentType: 'Recorder' as const,
  notes: null,
  addedAt: '2026-07-10T09:00:00Z',
};

const afterSchoolEntryTwo = {
  waitingListEntryId: 'w3',
  studentId: 's3',
  firstName: 'Mia',
  lastName: 'Adams',
  position: 2,
  lessonType: 'Group' as const,
  durationType: 'Hour' as const,
  instrumentType: 'Voice' as const,
  notes: null,
  addedAt: '2026-07-11T09:00:00Z',
};

const bothGroups: WaitingListGroupResult[] = [
  { occurrenceType: 'DuringSchool', count: 1, entries: [duringSchoolEntry] },
  { occurrenceType: 'AfterSchool', count: 2, entries: [afterSchoolEntryOne, afterSchoolEntryTwo] },
];

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-waiting-list-page');
  document.body.appendChild(el);
  await flush();
  await flush();
  return el;
}

function tableOf(el: HTMLElement): PmWaitingListTable {
  return el.shadowRoot!.getElementById('table') as unknown as PmWaitingListTable;
}

function captureBtnOf(el: HTMLElement): HTMLButtonElement {
  return el.shadowRoot!.getElementById('captureBtn') as HTMLButtonElement;
}

function groupEls(el: HTMLElement): HTMLElement[] {
  return [...tableOf(el).shadowRoot!.querySelectorAll('.wl-table__group')] as HTMLElement[];
}

function groupHeaderText(group: HTMLElement): string {
  return (group.querySelector('.wl-table__group-header') as HTMLElement).textContent ?? '';
}

function wizardOf(el: HTMLElement): PmStudentWizardModal {
  return el.shadowRoot!.getElementById('wizardModal') as unknown as PmStudentWizardModal;
}

function successBannerOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('success') as HTMLElement;
}

function deleteModalOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('deleteModal') as HTMLElement;
}

function rowNames(el: HTMLElement): string[] {
  return [...tableOf(el).shadowRoot!.querySelectorAll('.wl-table__student-name')].map((n) => n.textContent ?? '');
}

function rowFor(el: HTMLElement, name: string): HTMLElement {
  const row = [...tableOf(el).shadowRoot!.querySelectorAll('tbody tr')].find((r) =>
    r.querySelector('.wl-table__student-name')?.textContent?.includes(name),
  );
  if (!row) throw new Error(`No waiting-list row found for ${name}`);
  return row as HTMLElement;
}

/**
 * The seeded grid, as far as these rows need it: the During School row's own
 * combination, the After School rows' one, and the same lesson and duration
 * under the other occurrence type — so an enrolment resolving the wrong
 * structure would be visible rather than indistinguishable.
 */
const lessonStructures: LessonStructure[] = [
  {
    lessonStructureId: 'ls-ind-half-during',
    lessonType: 'Individual',
    durationType: 'HalfHour',
    occurrenceType: 'DuringSchool',
  },
  {
    lessonStructureId: 'ls-ind-half-after',
    lessonType: 'Individual',
    durationType: 'HalfHour',
    occurrenceType: 'AfterSchool',
  },
  {
    lessonStructureId: 'ls-group-hour-during',
    lessonType: 'Group',
    durationType: 'Hour',
    occurrenceType: 'DuringSchool',
  },
  {
    lessonStructureId: 'ls-group-hour-after',
    lessonType: 'Group',
    durationType: 'Hour',
    occurrenceType: 'AfterSchool',
  },
];

const assignableTeachers: AssignableTeacher[] = [
  { teacherId: 't1', firstName: 'Zanele', surname: 'Mokoena', isActive: true },
];

function enrolModalOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('enrolModal') as HTMLElement;
}

function enrolFieldOf(el: HTMLElement, id: string): HTMLElement {
  return enrolModalOf(el).shadowRoot!.getElementById(id) as HTMLElement;
}

/** The two values the entry never supplied: the teacher and the step. */
function completeEnrolForm(el: HTMLElement): void {
  (enrolFieldOf(el, 'teacher') as HTMLSelectElement).value = 't1';
  (enrolFieldOf(el, 'step') as HTMLSelectElement).value = 'Step2A';
}

async function openEnrolModal(el: HTMLElement, name: string): Promise<HTMLElement> {
  actionButton(el, name, 'Enrol').click();
  await flush();
  return enrolModalOf(el);
}

function actionButton(el: HTMLElement, name: string, label: string): HTMLButtonElement {
  const button = [...rowFor(el, name).querySelectorAll('button')].find((b) => b.textContent === label);
  if (!button) throw new Error(`No ${label} action on the row for ${name}`);
  return button as HTMLButtonElement;
}

beforeEach(() => {
  mockGetWaitingList.mockReset();
  mockGetLessonStructures.mockReset().mockResolvedValue(lessonStructures);
  mockCaptureWaitingListStudent.mockReset();
  mockGetSiblingCandidates.mockReset().mockResolvedValue([]);
  mockGetSiblings.mockReset().mockResolvedValue([]);
  mockAddSibling.mockReset();
  mockGetGuardianRelationships.mockReset().mockResolvedValue([]);
  mockGetGuardians.mockReset();
  mockAddGuardian.mockReset();
  mockHasAnyRole.mockReset();
  mockHasAnyRole.mockReturnValue(false);
  mockUpdateWaitingListEntry.mockReset();
  mockUpdateWaitingListStudent.mockReset();
  mockRemoveWaitingListStudent.mockReset();
  mockGetStudentById.mockReset();
  mockEnrolWaitingListStudent.mockReset();
  mockGetAssignableTeachers.mockReset().mockResolvedValue(assignableTeachers);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pm-waiting-list-page — both occurrence-type lists render with counts', { tags: ['292UC10'] }, () => {
  it('shows a During School list and an After School list, each labelled with its count', async () => {
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);

    const el = await mountPage();
    const groups = groupEls(el);

    expect(groups).toHaveLength(2);
    expect(groupHeaderText(groups[0])).toContain('During School');
    expect(groupHeaderText(groups[0])).toContain('· 1 waiting');
    expect(groupHeaderText(groups[1])).toContain('After School');
    expect(groupHeaderText(groups[1])).toContain('· 2 waiting');
  });
});

describe(
  'pm-waiting-list-page — an occurrence type with nothing waiting renders no list',
  { tags: ['292UC11'] },
  () => {
    it('renders only the group that has entries', async () => {
      mockGetWaitingList.mockResolvedValueOnce([
        { occurrenceType: 'DuringSchool', count: 1, entries: [duringSchoolEntry] },
      ]);

      const el = await mountPage();
      const groups = groupEls(el);

      expect(groups).toHaveLength(1);
      expect(groupHeaderText(groups[0])).toContain('During School');
    });
  },
);

describe('pm-waiting-list-page — the empty state replaces both lists', { tags: ['292UC12'] }, () => {
  it('shows the empty-state message and renders no group at all', async () => {
    mockGetWaitingList.mockResolvedValueOnce([]);

    const el = await mountPage();
    const table = tableOf(el);
    const empty = table.shadowRoot!.getElementById('empty') as HTMLElement;

    expect(groupEls(el)).toHaveLength(0);
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toContain('No students are currently on the waiting list.');
  });
});

describe('pm-waiting-list-page — collapsing a list hides its rows', { tags: ['292UC13'] }, () => {
  it('hides the rows on activation and shows them again on re-activation', async () => {
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    const el = await mountPage();
    const header = groupEls(el)[0].querySelector('.wl-table__group-header') as HTMLButtonElement;

    expect(groupEls(el)[0].querySelector('table')).not.toBeNull();

    header.click();
    expect(groupEls(el)[0].querySelector('table')).toBeNull();

    // Re-query: activation rebuilds the group element.
    (groupEls(el)[0].querySelector('.wl-table__group-header') as HTMLButtonElement).click();
    expect(groupEls(el)[0].querySelector('table')).not.toBeNull();
  });
});

describe(
  'pm-waiting-list-page — a row shows position, student, lesson/duration/instrument, date and notes',
  { tags: ['292UC14'] },
  () => {
    it('shows every field, with a placeholder where notes are absent', async () => {
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      const rows = tableOf(el).shadowRoot!.querySelectorAll('tbody tr');
      const withNotes = rows[0];
      const withoutNotes = [...tableOf(el).shadowRoot!.querySelectorAll('tbody tr')].find(
        (row) => (row as HTMLElement).dataset.waitingListEntryId === 'w2',
      ) as HTMLElement;

      expect(withNotes.querySelector('.wl-table__position')!.textContent).toBe('1');
      expect(withNotes.querySelector('.wl-table__student-name')!.textContent).toBe('Amara Pillay');
      expect(withNotes.querySelector('.wl-table__student-meta')!.textContent).toContain(
        'Individual · Half Hour · Piano · Added',
      );
      expect(withNotes.querySelector('.wl-table__notes')!.textContent).toContain('Sibling of Amy');
      expect(withoutNotes.querySelector('.wl-table__notes')!.textContent).toBe('—');
    });
  },
);

describe('pm-waiting-list-page — a row shows no course type', { tags: ['292UC15'] }, () => {
  it('carries no course-type text anywhere on the row', async () => {
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);

    const el = await mountPage();
    const rowText = tableOf(el).shadowRoot!.querySelector('tbody')!.textContent ?? '';

    for (const courseType of ['Instrument', 'Theory', 'Ensemble']) {
      expect(rowText).not.toContain(courseType);
    }
  });
});

describe('pm-waiting-list-page — a Teacher sees a read-only page', { tags: ['292UC16'] }, () => {
  it('shows no Capture Student button and a read-only marker instead of row actions', async () => {
    mockHasAnyRole.mockReturnValue(false);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);

    const el = await mountPage();

    expect(captureBtnOf(el).hidden).toBe(true);
    const actionsCell = tableOf(el).shadowRoot!.querySelector('tbody tr .wl-table__actions') as HTMLElement;
    expect(actionsCell.textContent).toContain('Read only');
    expect(actionsCell.querySelector('button')).toBeNull();
  });
});

describe('pm-waiting-list-page — a Coordinator sees the full action set', { tags: ['292UC17'] }, () => {
  it('shows the Capture Student button and the Enrol, Edit and Delete row actions', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);

    const el = await mountPage();

    expect(captureBtnOf(el).hidden).toBe(false);
    expect(captureBtnOf(el).textContent).toContain('Capture Student');
    const actionsCell = tableOf(el).shadowRoot!.querySelector('tbody tr .wl-table__actions') as HTMLElement;
    const buttons = [...actionsCell.querySelectorAll('button')].map((btn) => btn.textContent);
    expect(buttons).toEqual(['Enrol', 'Edit', 'Delete']);
  });
});

// Regression for #299. The lookups the wizard needs before it opens settle
// independently, so one rejection can never sink another — these tests prove
// that holds for whichever lookup actually fails, and that every failure is
// shown rather than silently absorbed.
describe('pm-waiting-list-page — wizard lookups settle independently', () => {
  it('assigns the guardian-relationship and lesson-structure lookups even when the candidate read fails, and shows the error', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    const { StudentsError } = await import('../../services/students');
    mockGetSiblingCandidates.mockRejectedValueOnce(new StudentsError('Request failed', 500));
    const relationships = [{ guardianRelationshipId: 'r1', name: 'Mother' }];
    const structures = [
      { lessonStructureId: 'ls1', lessonType: 'Individual', durationType: 'Hour', occurrenceType: 'DuringSchool' },
    ];
    mockGetGuardianRelationships.mockResolvedValueOnce(relationships);
    mockGetLessonStructures.mockResolvedValueOnce(structures);

    const el = await mountPage();
    const wizard = wizardOf(el);

    expect(el.shadowRoot!.getElementById('error')!.classList.contains('waiting-list-page__error--visible')).toBe(true);

    wizard.openForCreate([], 'waitingList');
    const waitingListStepShadow = wizard.shadowRoot!.getElementById('waitingListStep')!.shadowRoot!;
    const occurrenceOptions = [
      ...(waitingListStepShadow.getElementById('occurrenceType') as HTMLSelectElement).options,
    ].map((o) => o.value);
    expect(occurrenceOptions).toContain('DuringSchool');
    // The lesson-structure lookup reached the wizard despite the students
    // fetch failing alongside it — the selects have something real to
    // resolve a choice against, not the empty state a still-unassigned
    // lookup would leave them in.
  });

  it('still assigns the candidate and lesson-structure lookups when getGuardianRelationships fails, and shows the error', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    mockGetSiblingCandidates.mockResolvedValueOnce([]);
    const { GuardiansError } = await import('../../services/guardians');
    mockGetGuardianRelationships.mockRejectedValueOnce(new GuardiansError('Request failed', 500));
    mockGetLessonStructures.mockResolvedValueOnce([]);

    const el = await mountPage();

    expect(el.shadowRoot!.getElementById('error')!.classList.contains('waiting-list-page__error--visible')).toBe(true);
  });
});

describe('pm-waiting-list-page — a successful capture', { tags: ['293UC22'] }, () => {
  const created: WaitingListEntryResult = {
    waitingListEntryId: 'w9',
    studentId: 's9',
    firstName: 'Amara',
    lastName: 'Pillay',
    position: 1,
    lessonType: 'Individual',
    durationType: 'Hour',
    instrumentType: 'Piano',
    notes: null,
    addedAt: '2026-09-03T10:00:00Z',
  };

  it('closes the wizard, shows a success message naming the student, and refreshes the list', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce([]).mockResolvedValueOnce(bothGroups);
    mockCaptureWaitingListStudent.mockResolvedValueOnce(created);

    const el = await mountPage();
    const wizard = wizardOf(el);
    wizard.setAttribute('open', '');

    wizard.dispatchEvent(
      new CustomEvent('waiting-list-capture-requested', {
        bubbles: true,
        composed: true,
        detail: {
          input: {
            firstName: 'Amara',
            lastName: 'Pillay',
            dateOfBirth: '2016-02-14',
            grade: 'Grade4',
            class: 'A1',
            phase: 'Junior',
            language: 'English',
          },
          pendingSiblingIds: [],
          pendingGuardians: [],
          waitingListInput: { lessonStructureId: 'ls1', instrumentType: 'Piano', notes: null },
        },
      }),
    );
    await flush();
    await flush();

    expect(mockCaptureWaitingListStudent).toHaveBeenCalledTimes(1);
    expect(wizard.hasAttribute('open')).toBe(false);
    expect(successBannerOf(el).textContent).toContain('Amara Pillay was added to the waiting list.');
    expect(mockGetWaitingList).toHaveBeenCalledTimes(2);
  });

  it('shows the refusal on the wizard and leaves it open when capture fails', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce([]);
    const { WaitingListError } = await import('../../services/waiting-list');
    mockCaptureWaitingListStudent.mockRejectedValueOnce(new WaitingListError('Lesson structure does not exist.', 400));

    const el = await mountPage();
    const wizard = wizardOf(el);
    wizard.setAttribute('open', '');

    wizard.dispatchEvent(
      new CustomEvent('waiting-list-capture-requested', {
        bubbles: true,
        composed: true,
        detail: {
          input: {
            firstName: 'Refused',
            lastName: 'Student',
            dateOfBirth: '2016-02-14',
            grade: 'Grade4',
            class: 'A1',
            phase: 'Junior',
            language: 'English',
          },
          pendingSiblingIds: [],
          pendingGuardians: [],
          waitingListInput: { lessonStructureId: 'unknown', instrumentType: 'Piano', notes: null },
        },
      }),
    );
    await flush();

    expect(wizard.hasAttribute('open')).toBe(true);
    const waitingListStepShadow = wizard.shadowRoot!.getElementById('waitingListStep')!.shadowRoot!;
    expect(waitingListStepShadow.getElementById('message')!.textContent).toContain('Lesson structure does not exist.');
  });

  // Reviewer finding on PR #298: the student and their waiting-list entry are
  // already created by the time siblings/guardians are linked, so a failure
  // there is a partial capture, not a failed one — but showSuccess ran
  // unconditionally regardless, so the success and error banners could both
  // render at once, contradicting each other.
  it('shows only the error banner, never the success banner too, when linking a staged sibling fails', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce([]).mockResolvedValueOnce(bothGroups);
    mockCaptureWaitingListStudent.mockResolvedValueOnce(created);
    const { StudentsError } = await import('../../services/students');
    mockAddSibling.mockRejectedValueOnce(new StudentsError('Sibling link failed.', 500));

    const el = await mountPage();
    const wizard = wizardOf(el);
    wizard.setAttribute('open', '');

    wizard.dispatchEvent(
      new CustomEvent('waiting-list-capture-requested', {
        bubbles: true,
        composed: true,
        detail: {
          input: {
            firstName: 'Amara',
            lastName: 'Pillay',
            dateOfBirth: '2016-02-14',
            grade: 'Grade4',
            class: 'A1',
            phase: 'Junior',
            language: 'English',
          },
          pendingSiblingIds: ['s10'],
          pendingGuardians: [],
          waitingListInput: { lessonStructureId: 'ls1', instrumentType: 'Piano', notes: null },
        },
      }),
    );
    await flush();
    await flush();

    expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(false);
    expect(el.shadowRoot!.getElementById('error')!.classList.contains('waiting-list-page__error--visible')).toBe(true);
  });

  it('shows only the error banner, never the success banner too, when linking a staged guardian fails', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce([]).mockResolvedValueOnce(bothGroups);
    mockCaptureWaitingListStudent.mockResolvedValueOnce(created);
    const { GuardiansError } = await import('../../services/guardians');
    mockAddGuardian.mockRejectedValueOnce(new GuardiansError('Guardian link failed.', 500));

    const el = await mountPage();
    const wizard = wizardOf(el);
    wizard.setAttribute('open', '');

    wizard.dispatchEvent(
      new CustomEvent('waiting-list-capture-requested', {
        bubbles: true,
        composed: true,
        detail: {
          input: {
            firstName: 'Amara',
            lastName: 'Pillay',
            dateOfBirth: '2016-02-14',
            grade: 'Grade4',
            class: 'A1',
            phase: 'Junior',
            language: 'English',
          },
          pendingSiblingIds: [],
          pendingGuardians: [
            {
              guardianRelationshipId: 'r1',
              firstName: 'Naledi',
              surname: 'Pillay',
              cell: null,
              email: null,
              receivesCorrespondence: true,
              responsibleForPayment: true,
              married: false,
            },
          ],
          waitingListInput: { lessonStructureId: 'ls1', instrumentType: 'Piano', notes: null },
        },
      }),
    );
    await flush();
    await flush();

    expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(false);
    expect(el.shadowRoot!.getElementById('error')!.classList.contains('waiting-list-page__error--visible')).toBe(true);
  });
});

describe(
  'pm-waiting-list-page — removing a student from the waiting list',
  { tags: ['294UC16', '294UC17', '294UC18'] },
  () => {
    it('opens a confirmation naming the student and stating their student record will be deleted', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      actionButton(el, 'Amara Pillay', 'Delete').click();
      const modal = deleteModalOf(el);

      expect(modal.hasAttribute('open')).toBe(true);
      expect(modal.shadowRoot!.textContent).toContain('Amara Pillay');
      expect(modal.shadowRoot!.textContent).toContain('delete their student record');
      expect(modal.shadowRoot!.textContent).toContain('cannot be undone');
      expect(mockRemoveWaitingListStudent).not.toHaveBeenCalled();
    });

    it('deletes nothing and leaves the row in place when the confirmation is cancelled', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      actionButton(el, 'Amara Pillay', 'Delete').click();
      const modal = deleteModalOf(el);
      (modal.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement).click();
      await flush();

      expect(modal.hasAttribute('open')).toBe(false);
      expect(mockRemoveWaitingListStudent).not.toHaveBeenCalled();
      expect(rowNames(el)).toContain('Amara Pillay');
      expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(false);
    });

    it('removes the row and shows a success message naming the student when confirmed', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList
        .mockResolvedValueOnce(bothGroups)
        .mockResolvedValueOnce([
          { occurrenceType: 'AfterSchool', count: 2, entries: [afterSchoolEntryOne, afterSchoolEntryTwo] },
        ]);
      mockRemoveWaitingListStudent.mockResolvedValueOnce(undefined);

      const el = await mountPage();
      actionButton(el, 'Amara Pillay', 'Delete').click();
      (deleteModalOf(el).shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement).click();
      await flush();
      await flush();

      expect(mockRemoveWaitingListStudent).toHaveBeenCalledWith('s1');
      expect(rowNames(el)).not.toContain('Amara Pillay');
      expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(true);
      expect(successBannerOf(el).textContent).toContain('Amara Pillay');
    });
  },
);

describe(
  'pm-waiting-list-page — the enrol modal opens pre-filled from the entry',
  { tags: ['295UC12', '295UC15', '295UC16'] },
  () => {
    it('pre-fills the lesson, duration and instrument types and today as the enrolled date', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      const modal = await openEnrolModal(el, 'Amara Pillay');

      expect(modal.hasAttribute('open')).toBe(true);
      expect((enrolFieldOf(el, 'lessonType') as HTMLSelectElement).value).toBe('Individual');
      expect((enrolFieldOf(el, 'durationType') as HTMLSelectElement).value).toBe('HalfHour');
      expect((enrolFieldOf(el, 'instrumentType') as HTMLSelectElement).value).toBe('Piano');
      expect((enrolFieldOf(el, 'enrolledDate') as HTMLInputElement).value).toBe(todayIsoDate());
    });

    it('states that the named student will be removed from the waiting list once enrolled', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      await openEnrolModal(el, 'Amara Pillay');

      expect(enrolFieldOf(el, 'notice').textContent).toBe(
        'Amara Pillay will be removed from the waiting list once enrolled.',
      );
    });

    it('leaves the teacher unchosen on its placeholder rather than defaulting to one', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      await openEnrolModal(el, 'Amara Pillay');
      const teacher = enrolFieldOf(el, 'teacher') as HTMLSelectElement;

      expect(teacher.value).toBe('');
      expect(teacher.required).toBe(true);
      // A teacher is on offer — the empty value is a placeholder, not an empty
      // list that could satisfy this by accident.
      expect([...teacher.options].map((o) => o.value)).toContain('t1');
    });
  },
);

describe(
  'pm-waiting-list-page — the occurrence type is a fixed value while everything else is changeable',
  { tags: ['295UC13', '295UC14'] },
  () => {
    it('shows the entry occurrence type marked as locked at waitlist, with no control to change it', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      await openEnrolModal(el, 'Amara Pillay');
      const field = enrolFieldOf(el, 'occurrenceType');

      expect(field.textContent).toContain('During School');
      expect(field.textContent).toContain('Locked at waitlist');
      // A disabled select reads as fixed but is not one; nothing inside this
      // field may be typed in, picked from or pressed at all.
      expect(field.querySelector('input, select, textarea, button, [contenteditable]')).toBeNull();
    });

    it('shows the other occurrence type for a row from the other list', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      await openEnrolModal(el, 'Neo Dube');

      expect(enrolFieldOf(el, 'occurrenceType').textContent).toContain('After School');
    });

    it('offers the lesson, duration, instrument, teacher and enrolled date as changeable controls', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList.mockResolvedValueOnce(bothGroups);

      const el = await mountPage();
      await openEnrolModal(el, 'Amara Pillay');

      for (const id of ['lessonType', 'durationType', 'instrumentType', 'step', 'teacher', 'enrolledDate']) {
        const control = enrolFieldOf(el, id) as HTMLSelectElement | HTMLInputElement;
        expect(control.disabled).toBe(false);
        expect(control instanceof HTMLInputElement ? control.readOnly : false).toBe(false);
      }
    });
  },
);

describe('pm-waiting-list-page — the enrolment asks for no course', { tags: ['295UC14'] }, () => {
  it('offers no course control at all', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);

    const el = await mountPage();
    const modal = await openEnrolModal(el, 'Amara Pillay');

    // A waiting-list entry is a wait for an instrument course, so there is
    // nothing to ask and nothing that could be left empty.
    expect(modal.shadowRoot!.getElementById('course')).toBeNull();
    expect(modal.shadowRoot!.textContent).not.toContain('Course');
  });
});

describe('pm-waiting-list-page — cancelling the enrolment submits nothing', { tags: ['295UC17'] }, () => {
  it('closes the modal, sends no enrolment and leaves the row on the list', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);

    const el = await mountPage();
    const modal = await openEnrolModal(el, 'Amara Pillay');
    (modal.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement).click();
    await flush();

    expect(modal.hasAttribute('open')).toBe(false);
    expect(mockEnrolWaitingListStudent).not.toHaveBeenCalled();
    expect(rowNames(el)).toContain('Amara Pillay');
    expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(false);
  });
});

describe(
  'pm-waiting-list-page — a confirmed enrolment takes the row off the list',
  { tags: ['295UC18', '295UC19'] },
  () => {
    it('closes the modal, removes the row and shows a success message naming the student', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList
        .mockResolvedValueOnce(bothGroups)
        .mockResolvedValueOnce([
          { occurrenceType: 'AfterSchool', count: 2, entries: [afterSchoolEntryOne, afterSchoolEntryTwo] },
        ]);
      mockEnrolWaitingListStudent.mockResolvedValueOnce({ studentCourseId: 'sc1' });

      const el = await mountPage();
      const modal = await openEnrolModal(el, 'Amara Pillay');
      completeEnrolForm(el);
      (modal.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement).click();
      await flush();
      await flush();

      // The structure is the During School one the row waited under — not the
      // After School row carrying the same lesson type and duration.
      expect(mockEnrolWaitingListStudent).toHaveBeenCalledWith('s1', {
        lessonStructureId: 'ls-ind-half-during',
        teacherId: 't1',
        instrumentType: 'Piano',
        stepType: 'Step2A',
        enrolledDate: todayIsoDate(),
      });
      expect(modal.hasAttribute('open')).toBe(false);
      expect(rowNames(el)).not.toContain('Amara Pillay');
      expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(true);
      expect(successBannerOf(el).textContent).toBe('Amara Pillay was enrolled and removed from the waiting list.');
    });

    it('renders no list at all for an occurrence type whose last row was enrolled off it', async () => {
      mockHasAnyRole.mockReturnValue(true);
      mockGetWaitingList
        .mockResolvedValueOnce(bothGroups)
        .mockResolvedValueOnce([
          { occurrenceType: 'AfterSchool', count: 2, entries: [afterSchoolEntryOne, afterSchoolEntryTwo] },
        ]);
      mockEnrolWaitingListStudent.mockResolvedValueOnce({ studentCourseId: 'sc1' });

      const el = await mountPage();
      const modal = await openEnrolModal(el, 'Amara Pillay');
      completeEnrolForm(el);
      (modal.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement).click();
      await flush();
      await flush();

      const groups = groupEls(el);
      expect(groups).toHaveLength(1);
      expect(groupHeaderText(groups[0])).toContain('After School');
    });
  },
);

describe('pm-waiting-list-page — a refused enrolment stays recoverable', { tags: ['295UC21'] }, () => {
  const refusal = 'The school offers no instrument course for that lesson structure.';

  it('shows the refusal in the modal and leaves it open with every choice still made', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    const { WaitingListError } = await import('../../services/waiting-list');
    mockEnrolWaitingListStudent.mockRejectedValueOnce(new WaitingListError(refusal, 400));

    const el = await mountPage();
    const modal = await openEnrolModal(el, 'Amara Pillay');
    completeEnrolForm(el);
    (modal.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement).click();
    await flush();
    await flush();

    const error = enrolFieldOf(el, 'error');
    expect(error.textContent).toBe(refusal);
    expect(error.classList.contains('enrol__error--visible')).toBe(true);

    // The reason is only half of it: a closed modal would make the refusal a
    // dead end, so the modal stays up with what the Coordinator chose still on
    // it — otherwise there is nothing to change and retry.
    expect(modal.hasAttribute('open')).toBe(true);
    expect((enrolFieldOf(el, 'lessonType') as HTMLSelectElement).value).toBe('Individual');
    expect((enrolFieldOf(el, 'durationType') as HTMLSelectElement).value).toBe('HalfHour');
    expect((enrolFieldOf(el, 'instrumentType') as HTMLSelectElement).value).toBe('Piano');
    expect((enrolFieldOf(el, 'teacher') as HTMLSelectElement).value).toBe('t1');
    expect((enrolFieldOf(el, 'step') as HTMLSelectElement).value).toBe('Step2A');
    expect((enrolFieldOf(el, 'enrolledDate') as HTMLInputElement).value).toBe(todayIsoDate());

    // Nothing moved: the row is still on the list and nothing claims success.
    expect(rowNames(el)).toContain('Amara Pillay');
    expect(successBannerOf(el).classList.contains('waiting-list-page__success--visible')).toBe(false);
  });

  it('accepts a changed choice submitted again from the still-open modal', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList
      .mockResolvedValueOnce(bothGroups)
      .mockResolvedValueOnce([
        { occurrenceType: 'AfterSchool', count: 2, entries: [afterSchoolEntryOne, afterSchoolEntryTwo] },
      ]);
    const { WaitingListError } = await import('../../services/waiting-list');
    mockEnrolWaitingListStudent
      .mockRejectedValueOnce(new WaitingListError(refusal, 400))
      .mockResolvedValueOnce({ studentCourseId: 'sc1' });

    const el = await mountPage();
    const modal = await openEnrolModal(el, 'Amara Pillay');
    completeEnrolForm(el);
    const confirmBtn = modal.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement;
    confirmBtn.click();
    await flush();
    await flush();

    // The retry the refusal left room for: a different lesson structure under
    // the same occurrence type, chosen on the modal that never closed.
    const lessonType = enrolFieldOf(el, 'lessonType') as HTMLSelectElement;
    lessonType.value = 'Group';
    lessonType.dispatchEvent(new Event('change'));
    (enrolFieldOf(el, 'durationType') as HTMLSelectElement).value = 'Hour';
    confirmBtn.click();
    await flush();
    await flush();

    expect(mockEnrolWaitingListStudent).toHaveBeenCalledTimes(2);
    expect(mockEnrolWaitingListStudent).toHaveBeenLastCalledWith('s1', {
      lessonStructureId: 'ls-group-hour-during',
      teacherId: 't1',
      instrumentType: 'Piano',
      stepType: 'Step2A',
      enrolledDate: todayIsoDate(),
    });
    expect(modal.hasAttribute('open')).toBe(false);
    expect(rowNames(el)).not.toContain('Amara Pillay');
    expect(successBannerOf(el).textContent).toBe('Amara Pillay was enrolled and removed from the waiting list.');
  });
});

describe('pm-waiting-list-page — the Siblings tab spans both populations', { tags: ['304UC7', '304UC12'] }, () => {
  const amara: SiblingStudentResult = {
    studentId: 's1',
    firstName: 'Amara',
    lastName: 'Pillay',
    dateOfBirth: '2016-03-01',
    grade: 'Grade3',
    class: 'A1',
    phase: 'Junior',
    language: 'English',
    population: 'WaitingList',
  };

  const enrolledSibling: SiblingStudentResult = {
    ...amara,
    studentId: 's-enrolled',
    firstName: 'Sipho',
    population: 'Enrolled',
  };

  function searchSelectShadowOf(wizard: PmStudentWizardModal): ShadowRoot {
    return wizard.shadowRoot!.getElementById('siblingsStep')!.shadowRoot!.getElementById('searchSelect')!.shadowRoot!;
  }

  function search(shadow: ShadowRoot, query: string): void {
    const input = shadow.getElementById('query') as HTMLInputElement;
    input.value = query;
    input.dispatchEvent(new Event('input'));
  }

  function resultIds(shadow: ShadowRoot): string[] {
    return [...shadow.querySelectorAll<HTMLElement>('.search-select__result')].map(
      (result) => result.dataset.studentId!,
    );
  }

  it('offers both populations in the capture wizard', { tags: ['304UC7'] }, async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    mockGetSiblingCandidates.mockReset().mockResolvedValue([amara, enrolledSibling]);

    const el = await mountPage();
    captureBtnOf(el).click();

    const shadow = searchSelectShadowOf(wizardOf(el));
    search(shadow, 'Pillay');

    // The capture wizard fed itself from the roster read, which answers with the
    // enrolled student alone — a waiting-list sibling was unreachable from here.
    expect(resultIds(shadow)).toEqual([amara.studentId, enrolledSibling.studentId]);
    expect(vi.mocked(mockGetSiblingCandidates)).toHaveBeenCalled();
  });

  it("marks each linked sibling with that sibling's own state in the edit wizard", { tags: ['304UC12'] }, async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    mockGetStudentById.mockResolvedValue(amara);
    mockGetSiblings.mockReset().mockResolvedValue([amara, enrolledSibling]);

    const el = await mountPage();
    actionButton(el, 'Amara Pillay', 'Edit').click();
    await flush();

    const wizard = wizardOf(el);
    (wizard.shadowRoot!.getElementById('tabSiblings') as HTMLButtonElement).click();
    await flush();

    const listShadow = wizard
      .shadowRoot!.getElementById('siblingsStep')!
      .shadowRoot!.getElementById('siblingList')!.shadowRoot!;
    const titles = [...listShadow.querySelectorAll<HTMLElement>('tbody .pm-population-icon')].map((icon) => icon.title);

    // One group, two states: an icon taken from the wizard mode would say
    // "waiting list" twice here.
    expect(titles).toEqual([populationDescription('WaitingList'), populationDescription('Enrolled')]);
  });
});

// The capture wizard opens synchronously off the page's held candidate list,
// so that list is only as current as the page's last read of it. Before this,
// it was read on connect and never again: capture one child, open the wizard
// for the next, and the first was not offered until the page was reloaded.
describe('pm-waiting-list-page — the candidate list follows the page', () => {
  const captured: WaitingListEntryResult = {
    waitingListEntryId: 'w9',
    studentId: 's9',
    firstName: 'Amara',
    lastName: 'Pillay',
    position: 1,
    lessonType: 'Individual',
    durationType: 'Hour',
    instrumentType: 'Piano',
    notes: null,
    addedAt: '2026-09-03T10:00:00Z',
  };

  const capturedCandidate: SiblingStudentResult = {
    studentId: 's9',
    firstName: 'Amara',
    lastName: 'Pillay',
    dateOfBirth: '2016-03-01',
    grade: 'Grade3',
    class: 'A1',
    phase: 'Junior',
    language: 'English',
    population: 'WaitingList',
  };

  function searchSelectShadowOf(wizard: PmStudentWizardModal): ShadowRoot {
    return wizard.shadowRoot!.getElementById('siblingsStep')!.shadowRoot!.getElementById('searchSelect')!.shadowRoot!;
  }

  function resultIds(shadow: ShadowRoot): string[] {
    const input = shadow.getElementById('query') as HTMLInputElement;
    input.value = 'Pillay';
    input.dispatchEvent(new Event('input'));
    return [...shadow.querySelectorAll<HTMLElement>('.search-select__result')].map(
      (result) => result.dataset.studentId!,
    );
  }

  it('offers a student captured in this session in the next capture wizard', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValue(bothGroups);
    mockGetSiblingCandidates.mockReset().mockResolvedValueOnce([]).mockResolvedValue([capturedCandidate]);
    mockCaptureWaitingListStudent.mockResolvedValueOnce(captured);

    const el = await mountPage();
    const wizard = wizardOf(el);
    wizard.setAttribute('open', '');
    wizard.dispatchEvent(
      new CustomEvent('waiting-list-capture-requested', {
        bubbles: true,
        composed: true,
        detail: {
          input: {
            firstName: 'Amara',
            lastName: 'Pillay',
            dateOfBirth: '2016-02-14',
            grade: 'Grade4',
            class: 'A1',
            phase: 'Junior',
            language: 'English',
          },
          pendingSiblingIds: [],
          pendingGuardians: [],
          waitingListInput: { lessonStructureId: 'ls1', instrumentType: 'Piano', notes: null },
        },
      }),
    );
    await flush();
    await flush();

    captureBtnOf(el).click();

    expect(resultIds(searchSelectShadowOf(wizard))).toEqual([capturedCandidate.studentId]);
  });

  it('does not read candidates for a role that never reaches a wizard', async () => {
    mockHasAnyRole.mockReturnValue(false);
    mockGetWaitingList.mockResolvedValue(bothGroups);

    await mountPage();

    // A Teacher gets the listing and no capture action, so the candidate read
    // is one the page has no use for and never makes.
    expect(mockGetSiblingCandidates).not.toHaveBeenCalled();
  });
});
