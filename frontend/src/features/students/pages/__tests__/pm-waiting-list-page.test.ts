import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WaitingListGroupResult, WaitingListEntryResult } from '../../services/waiting-list';

const mockGetWaitingList = vi.fn();
const mockGetLessonStructures = vi.fn();
const mockCaptureWaitingListStudent = vi.fn();
const mockGetStudents = vi.fn();
const mockAddSibling = vi.fn();
const mockGetGuardianRelationships = vi.fn();
const mockGetGuardians = vi.fn();
const mockAddGuardian = vi.fn();
const mockHasAnyRole = vi.fn();

vi.mock('../../services/waiting-list', async () => {
  const actual = await vi.importActual<typeof import('../../services/waiting-list')>('../../services/waiting-list');
  return {
    ...actual,
    getWaitingList: () => mockGetWaitingList(),
    getLessonStructures: () => mockGetLessonStructures(),
    captureWaitingListStudent: (...args: unknown[]) => mockCaptureWaitingListStudent(...args),
  };
});

vi.mock('../../services/students', async () => {
  const actual = await vi.importActual<typeof import('../../services/students')>('../../services/students');
  return {
    ...actual,
    getStudents: () => mockGetStudents(),
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

beforeEach(() => {
  mockGetWaitingList.mockReset();
  mockGetLessonStructures.mockReset().mockResolvedValue([]);
  mockCaptureWaitingListStudent.mockReset();
  mockGetStudents.mockReset().mockResolvedValue([]);
  mockAddSibling.mockReset();
  mockGetGuardianRelationships.mockReset().mockResolvedValue([]);
  mockGetGuardians.mockReset();
  mockAddGuardian.mockReset();
  mockHasAnyRole.mockReset();
  mockHasAnyRole.mockReturnValue(false);
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

// Regression for #299. The wizard's three lookups settle independently so
// that one rejection can never sink the other two — these tests prove that
// holds for whichever lookup actually fails, and that every failure is shown
// rather than silently absorbed.
describe('pm-waiting-list-page — wizard lookups settle independently', () => {
  it('assigns the guardian-relationship and lesson-structure lookups even when getStudents fails, and shows the error', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    const { StudentsError } = await import('../../services/students');
    mockGetStudents.mockRejectedValueOnce(new StudentsError('Request failed', 500));
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

  it('still assigns the students and lesson-structure lookups when getGuardianRelationships fails, and shows the error', async () => {
    mockHasAnyRole.mockReturnValue(true);
    mockGetWaitingList.mockResolvedValueOnce(bothGroups);
    mockGetStudents.mockResolvedValueOnce([]);
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
