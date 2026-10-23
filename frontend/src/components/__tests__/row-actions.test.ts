import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compactButtonStyles } from '../compact-button-styles';
import { AdminError, type GetUserResult } from '../../features/admin/services/admin';
import type { Course } from '../../features/courses/services/courses';
import type { ExtraCurricular } from '../../features/extra-curriculars/services/extra-curriculars';
import type { WaitingListGroupResult } from '../../features/students/services/waiting-list';
import type {
  EnrollmentResult,
  AssignableTeacher,
  EnrollableCourse,
} from '../../features/students/services/enrollments';
import type { SiblingStudentResult, StudentResult } from '../../features/students/services/students';
import type { SessionResult } from '../../features/sessions/services/sessions';
import type { SavedReportSummary } from '../../features/reports/models/report';
import type { TeacherResult } from '../../features/teachers/services/teachers';
import type { PmCourseTable } from '../../features/courses/components/pm-course-table';
import type { PmExtraCurricularTable } from '../../features/extra-curriculars/components/pm-extra-curricular-table';
import type { PmUsersTable } from '../../features/admin/components/pm-users-table';
import type { PmRelationshipList } from '../../features/students/components/pm-relationship-list';
import type { PmGuardianList, GuardianListItem } from '../../features/students/components/pm-guardian-list';
import type { PmEnrollmentList } from '../../features/students/components/pm-enrollment-list';
import type { PmStudentsTable } from '../../features/students/components/pm-students-table';
import type { PmWaitingListTable } from '../../features/students/components/pm-waiting-list-table';
import type { PmSiblingList } from '../../features/students/components/pm-sibling-list';
import type { PmBankingSection } from '../../features/teachers/components/pm-banking-section';

const mockUpdateUserRoles = vi.fn();
vi.mock('../../features/admin/services/admin', async () => {
  const actual = await vi.importActual<typeof import('../../features/admin/services/admin')>(
    '../../features/admin/services/admin',
  );
  return {
    ...actual,
    updateUserRoles: (userId: string, roles: string[]) => mockUpdateUserRoles(userId, roles),
  };
});

import '../../features/courses/components/pm-course-table';
import '../../features/extra-curriculars/components/pm-extra-curricular-table';
import '../../features/admin/components/pm-users-table';
import '../../features/students/components/pm-relationship-list';
import '../../features/students/components/pm-guardian-list';
import '../../features/students/components/pm-enrollment-list';
import '../../features/students/components/pm-students-table';
import '../../features/students/components/pm-waiting-list-table';
import '../../features/students/components/pm-delete-waiting-list-entry-modal';
import '../../features/students/components/pm-sibling-list';
import '../../features/students/components/pm-extra-curriculars-step';
import '../../features/reports/components/pm-saved-reports-table';
import '../../features/reports/components/pm-report-filter-row';
import '../../features/sessions/components/pm-sessions-table';
import '../../features/teachers/components/pm-teacher-table';
import '../../features/teachers/components/pm-banking-section';
import '../../features/teachers/components/pm-teacher-profile-section';
import '../../features/teachers/components/pm-my-details-modal';
import '../../features/admin/components/pm-user-created-banner';
import '../../features/admin/components/pm-reinvite-banner';

const mounted: HTMLElement[] = [];

function mount<T extends HTMLElement>(tag: string): T {
  const element = document.createElement(tag) as T;
  document.body.appendChild(element);
  mounted.push(element);
  return element;
}

afterEach(() => {
  for (const element of mounted.splice(0)) element.remove();
});

const tick = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

function labelOf(button: Element): string {
  return Array.from(button.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join('')
    .trim();
}

function labelsIn(container: Element): string[] {
  return Array.from(container.querySelectorAll('button')).map((button) => labelOf(button));
}

function buttonNamed(root: ParentNode, label: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => labelOf(button) === label,
  );
  if (!found) throw new Error(`No ${label} button`);
  return found;
}

function firstRowActions(root: ParentNode): HTMLElement {
  return root.querySelector<HTMLElement>('tbody [data-testid="row-actions"]')!;
}

function isDestructive(button: Element): boolean {
  return button.classList.contains('compact-btn--destructive');
}

function expectBusy(root: ParentNode): void {
  const save = buttonNamed(root, 'Save');
  const cancel = buttonNamed(root, 'Cancel');
  expect(save.disabled).toBe(true);
  expect(save.getAttribute('aria-busy')).toBe('true');
  expect(labelOf(save)).toBe('Save');
  expect(save.firstElementChild?.getAttribute('data-testid')).toBe('button-loading-icon');
  expect(cancel.disabled).toBe(true);
}

function expectIdle(root: ParentNode): void {
  const save = buttonNamed(root, 'Save');
  const cancel = buttonNamed(root, 'Cancel');
  expect(save.disabled).toBe(false);
  expect(save.hasAttribute('aria-busy')).toBe(false);
  expect(save.querySelector('[data-testid="button-loading-icon"]')).toBeNull();
  expect(cancel.disabled).toBe(false);
}

function expectNoEditRow(root: ParentNode): void {
  expect(Array.from(root.querySelectorAll('button')).some((button) => labelOf(button) === 'Save')).toBe(false);
}

function expectSaveIsLastControlOfItsRow(root: ParentNode): void {
  const save = buttonNamed(root, 'Save');
  const row = save.closest('tr')!;
  const controls = Array.from(row.querySelectorAll('button, input, select'));
  expect(controls[controls.length - 1]).toBe(save);
  const actions = save.closest('[data-testid="row-actions"]')!;
  expect(labelsIn(actions)).toEqual(['Cancel', 'Save']);
}

function type(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const course: Course = {
  courseId: 'c1',
  courseType: 'Theory',
  cost: '120.00',
  lessonStructureId: 'ls1',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'DuringSchool',
};

const choir: ExtraCurricular = {
  extraCurricularId: 'ec1',
  description: 'Junior Choir',
  phase: 'Junior',
  practiceTimes: [{ practiceTimeId: 'pt1', day: 'Tuesday', startTime: '14:30:00' }],
};

function user(overrides: Partial<GetUserResult> = {}): GetUserResult {
  return {
    userId: 'u1',
    email: 'teacher@test.com',
    roles: ['Teacher'],
    isActive: true,
    isProtected: false,
    hasCompletedRegistration: true,
    ...overrides,
  };
}

const mother = { guardianRelationshipId: 'gr1', name: 'Mother' };

const guardian: GuardianListItem = {
  guardianId: 'g1',
  guardianRelationshipId: 'gr1',
  firstName: 'Nomvula',
  surname: 'Dube',
  cell: '0821234567',
  email: 'nomvula@example.com',
  receivesCorrespondence: true,
  responsibleForPayment: false,
  married: false,
  restricted: false,
};

const instrumentCourse: EnrollableCourse = {
  courseId: 'c-instrument',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const thabo: AssignableTeacher = { teacherId: 't1', firstName: 'Thabo', surname: 'Nkosi', isActive: true };
const lindiwe: AssignableTeacher = { teacherId: 't2', firstName: 'Lindiwe', surname: 'Mabaso', isActive: true };

const enrollment: EnrollmentResult = {
  studentCourseId: 'sc1',
  studentId: 's1',
  courseId: 'c-instrument',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
  teacherId: 't1',
  teacherFirstName: 'Thabo',
  teacherSurname: 'Nkosi',
  instrumentType: 'Piano',
  stepType: 'Step2A',
  enrolledDate: '2026-01-19',
};

const student: StudentResult = {
  studentId: 's1',
  firstName: 'Thandi',
  lastName: 'Mokoena',
  dateOfBirth: '2015-03-12',
  grade: 'Grade5',
  class: 'E2',
  phase: 'Junior',
  language: 'English',
};

describe('course table row actions', { tags: ['380UC1'] }, () => {
  it('reads Edit then Delete, with Delete destructive and no Edit Cost', () => {
    const table = mount<PmCourseTable>('pm-course-table');
    table.showActions = true;
    table.courses = [course];

    const actions = firstRowActions(table.shadowRoot!);
    expect(labelsIn(actions)).toEqual(['Edit', 'Delete']);
    const [edit, del] = Array.from(actions.querySelectorAll('button'));
    expect(isDestructive(del)).toBe(true);
    expect(isDestructive(edit)).toBe(false);
    expect(table.shadowRoot!.textContent).not.toContain('Edit Cost');
  });
});

describe('users table row actions', () => {
  it('reads Reactivate then Delete on a deactivated user', { tags: ['380UC2'] }, () => {
    const table = mount<PmUsersTable>('pm-users-table');
    table.users = [user({ isActive: false, hasCompletedRegistration: true })];

    const actions = firstRowActions(table.shadowRoot!);
    expect(labelsIn(actions)).toEqual(['Reactivate', 'Delete']);
    expect(labelsIn(table.shadowRoot!.querySelector('tbody')!)).not.toContain('Activate');
    const buttons = Array.from(actions.querySelectorAll('button'));
    expect(isDestructive(buttons[1])).toBe(true);
    expect(isDestructive(buttons[0])).toBe(false);
  });

  it('reads Regenerate on a pending user', { tags: ['380UC3'] }, () => {
    const table = mount<PmUsersTable>('pm-users-table');
    table.users = [user({ isActive: false, hasCompletedRegistration: false })];

    expect(labelsIn(firstRowActions(table.shadowRoot!))).toEqual(['Regenerate']);
  });
});

describe('waiting list row actions', { tags: ['380UC4'] }, () => {
  const groups: WaitingListGroupResult[] = [
    {
      occurrenceType: 'DuringSchool',
      count: 1,
      entries: [
        {
          waitingListEntryId: 'w1',
          studentId: 's1',
          firstName: 'Amara',
          lastName: 'Pillay',
          position: 1,
          lessonType: 'Individual',
          durationType: 'HalfHour',
          instrumentType: 'Piano',
          notes: null,
          addedAt: '2026-02-01T08:00:00Z',
        },
      ],
    },
  ];

  it('reads Enrol, Edit, Remove with Remove destructive', () => {
    const table = mount<PmWaitingListTable>('pm-waiting-list-table');
    table.showActions = true;
    table.groups = groups;

    const actions = firstRowActions(table.shadowRoot!);
    expect(labelsIn(actions)).toEqual(['Enrol', 'Edit', 'Remove']);
    const buttons = Array.from(actions.querySelectorAll('button'));
    expect(isDestructive(buttons[2])).toBe(true);
    expect(isDestructive(buttons[0])).toBe(false);
    expect(isDestructive(buttons[1])).toBe(false);
  });

  it('keeps the Read only marker outside the row actions for a viewer without actions', () => {
    const table = mount<PmWaitingListTable>('pm-waiting-list-table');
    table.showActions = false;
    table.groups = groups;

    expect(table.shadowRoot!.querySelector('[data-testid="row-actions"]')).toBeNull();
    expect(table.shadowRoot!.querySelector('tbody')!.textContent).toContain('Read only');
  });

  it('confirms the removal with a button reading Remove', () => {
    const modal = mount('pm-delete-waiting-list-entry-modal');

    expect(labelOf(modal.shadowRoot!.getElementById('deleteBtn')!)).toBe('Remove');
  });
});

describe('enrollment list row actions', { tags: ['380UC5'] }, () => {
  function mountList(isPersisted: boolean): PmEnrollmentList {
    const list = mount<PmEnrollmentList>('pm-enrollment-list');
    list.courses = [instrumentCourse];
    list.teachers = [thabo, lindiwe];
    list.isPersisted = isPersisted;
    list.enrollments = [enrollment];
    return list;
  }

  it('reads Edit and Remove for a staged row, with Remove destructive', () => {
    const list = mountList(false);

    const actions = firstRowActions(list.shadowRoot!);
    expect(labelsIn(actions)).toEqual(['Edit', 'Remove']);
    expect(isDestructive(actions.querySelectorAll('button')[1])).toBe(true);
  });

  it('reads Edit and Withdraw for a saved row, with Withdraw destructive', () => {
    const list = mountList(true);

    const actions = firstRowActions(list.shadowRoot!);
    expect(labelsIn(actions)).toEqual(['Edit', 'Withdraw']);
    expect(isDestructive(actions.querySelectorAll('button')[1])).toBe(true);
  });
});

describe('sibling list row action', { tags: ['380UC6'] }, () => {
  it('reads Unlink in the default variant', () => {
    const list = mount<PmSiblingList>('pm-sibling-list');
    const sibling: SiblingStudentResult = { ...student, studentId: 's2', firstName: 'Naledi', population: 'Enrolled' };
    list.siblings = [sibling];

    const actions = firstRowActions(list.shadowRoot!);
    expect(labelsIn(actions)).toEqual(['Unlink']);
    expect(isDestructive(actions.querySelector('button')!)).toBe(false);
  });
});

describe('report filter row remove button', { tags: ['380UC7'] }, () => {
  it('keeps its accessible name and shows a close icon instead of a multiplication sign', () => {
    const row = mount('pm-report-filter-row');
    const button = row.shadowRoot!.getElementById('remove')!;

    expect(button.getAttribute('aria-label')).toBe('Remove filter');
    const icon = button.querySelector('span')!;
    expect(icon.textContent).toBe('close');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(button.textContent).not.toContain('×');
  });
});

describe('students table row actions', { tags: ['380UC8'] }, () => {
  function mountTable(): PmStudentsTable {
    const table = mount<PmStudentsTable>('pm-students-table');
    table.students = [student];
    return table;
  }

  it('reads Edit then Delete in the main row, with Delete destructive, and never holds Print there', () => {
    const table = mountTable();
    const root = table.shadowRoot!;

    const actions = firstRowActions(root);
    expect(labelsIn(actions)).toEqual(['Edit', 'Delete']);
    expect(isDestructive(actions.querySelectorAll('button')[1])).toBe(true);

    root.querySelector<HTMLButtonElement>('.students-table__chevron-btn')!.click();
    table.markSummaryLoaded('s1');
    expect(labelsIn(firstRowActions(root))).toEqual(['Edit', 'Delete']);
  });

  it('keeps Print in the expanded view as a text-only default compact button', () => {
    const table = mountTable();
    const root = table.shadowRoot!;
    root.querySelector<HTMLButtonElement>('.students-table__chevron-btn')!.click();
    table.markSummaryLoaded('s1');

    const print = root.querySelector<HTMLButtonElement>('tr.students-table__summary-row .students-table__btn--print')!;
    expect(labelOf(print)).toBe('Print');
    expect(print.classList.contains('compact-btn')).toBe(true);
    expect(isDestructive(print)).toBe(false);
    expect(print.children).toHaveLength(0);
    expect(print.closest('tbody [data-testid="row-actions"]')).toBeNull();
  });
});

describe('banking section record actions', { tags: ['380UC9'] }, () => {
  it('uses compact buttons with text only', () => {
    const section = mount<PmBankingSection>('pm-banking-section');
    section.setAttribute('self-service', '');
    const teacher: TeacherResult = {
      teacherId: 't1',
      firstName: 'Thandi',
      surname: 'Mokoena',
      isPrivate: false,
      isActive: true,
      linkedAccountId: null,
      linkedAccountEmail: null,
      banking: { bank: 'Capitec', accountType: 'Savings', branchCode: '470010', accountNumberLast4: '1234' },
    } as TeacherResult;
    section.teacher = teacher;
    const root = section.shadowRoot!;

    const readActions = root.getElementById('readActions')!;
    expect(readActions.hidden).toBe(false);
    expect(labelsIn(readActions)).toEqual(['Edit', 'Delete']);
    expect(isDestructive(root.getElementById('deleteBtn')!)).toBe(true);

    for (const id of ['editBtn', 'deleteBtn', 'revealBtn', 'activityBtn']) {
      const button = root.getElementById(id)!;
      expect(button.classList.contains('compact-btn')).toBe(true);
      expect(button.children).toHaveLength(0);
    }
    expect(labelOf(root.getElementById('revealBtn')!)).toBe('Reveal');
    expect(labelOf(root.getElementById('activityBtn')!)).toBe('Activity');
  });
});

describe('inline edit rows', () => {
  const pending = (): {
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (e: unknown) => void;
  } => {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (e: unknown) => void = () => undefined;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  describe('hold Cancel then Save with Save last', { tags: ['380UC10'] }, () => {
    it('in the course table', () => {
      const table = mount<PmCourseTable>('pm-course-table');
      table.showActions = true;
      table.courses = [course];
      buttonNamed(table.shadowRoot!, 'Edit').click();

      expectSaveIsLastControlOfItsRow(table.shadowRoot!);
    });

    it('in the extra-curricular table', () => {
      const table = mount<PmExtraCurricularTable>('pm-extra-curricular-table');
      table.showActions = true;
      table.extraCurriculars = [choir];
      buttonNamed(table.shadowRoot!, 'Edit').click();

      expectSaveIsLastControlOfItsRow(table.shadowRoot!);
    });

    it('in the users table', () => {
      const table = mount<PmUsersTable>('pm-users-table');
      table.users = [user()];
      buttonNamed(table.shadowRoot!, 'Edit').click();

      expectSaveIsLastControlOfItsRow(table.shadowRoot!);
    });

    it('in the relationship list', () => {
      const list = mount<PmRelationshipList>('pm-relationship-list');
      list.relationships = [mother];
      buttonNamed(list.shadowRoot!, 'Edit').click();

      expectSaveIsLastControlOfItsRow(list.shadowRoot!);
    });

    it('in the guardian list', () => {
      const list = mount<PmGuardianList>('pm-guardian-list');
      list.relationships = [mother];
      list.isPersisted = true;
      list.guardians = [guardian];
      buttonNamed(list.shadowRoot!, 'Edit').click();

      expectSaveIsLastControlOfItsRow(list.shadowRoot!);
    });

    it('in the enrollment list', () => {
      const list = mount<PmEnrollmentList>('pm-enrollment-list');
      list.teachers = [thabo, lindiwe];
      list.isPersisted = true;
      list.enrollments = [enrollment];
      buttonNamed(list.shadowRoot!, 'Edit').click();

      expectSaveIsLastControlOfItsRow(list.shadowRoot!);
    });
  });

  describe('enter the loading state with entries kept and leave it on every outcome', { tags: ['380UC11'] }, () => {
    beforeEach(() => {
      mockUpdateUserRoles.mockReset();
    });

    describe('course table', () => {
      function startSave(): { table: PmCourseTable; root: ShadowRoot; save: () => void } {
        const table = mount<PmCourseTable>('pm-course-table');
        table.showActions = true;
        table.courses = [course];
        const root = table.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('#costInput')!, '150.00');
        return { table, root, save: () => buttonNamed(root, 'Save').click() };
      }

      it('shows busy, keeps the entry across a re-render and restores on a row error', () => {
        const { table, root, save } = startSave();
        save();

        expectBusy(root);
        expect(root.querySelector<HTMLInputElement>('#costInput')!.value).toBe('150.00');
        table.showActions = true;
        expectBusy(root);
        expect(root.querySelector<HTMLInputElement>('#costInput')!.value).toBe('150.00');

        table.showRowError('c1', 'Refused.');
        expectIdle(root);
        expect(root.querySelector<HTMLInputElement>('#costInput')!.value).toBe('150.00');
      });

      it('leaves edit when the list is replaced', () => {
        const { table, root, save } = startSave();
        save();

        table.courses = [course];
        expectNoEditRow(root);
        expect(root.querySelector('[aria-busy="true"]')).toBeNull();
      });

      it('does not enter busy for a refused cost', () => {
        const { root } = startSave();
        type(root.querySelector<HTMLInputElement>('#costInput')!, '12.345');
        buttonNamed(root, 'Save').click();

        expectIdle(root);
      });

      it('does not leave another row showing busy when the edit moves', () => {
        const table = mount<PmCourseTable>('pm-course-table');
        table.showActions = true;
        table.courses = [course, { ...course, courseId: 'c2' }];
        const root = table.shadowRoot!;
        buttonNamed(root.querySelector('tbody tr:nth-child(1)')!, 'Edit').click();
        buttonNamed(root, 'Save').click();
        expectBusy(root);

        buttonNamed(root.querySelector('tbody tr:nth-child(2)')!, 'Edit').click();

        expectIdle(root);
      });
    });

    describe('extra-curricular table', () => {
      function startSave(): { table: PmExtraCurricularTable; root: ShadowRoot } {
        const table = mount<PmExtraCurricularTable>('pm-extra-curricular-table');
        table.showActions = true;
        table.extraCurriculars = [choir];
        const root = table.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('#descriptionInput')!, 'Senior Choir');
        buttonNamed(root, 'Save').click();
        return { table, root };
      }

      it('shows busy, keeps the entry across a re-render and restores on a row error', () => {
        const { table, root } = startSave();

        expectBusy(root);
        expect(root.querySelector<HTMLInputElement>('#descriptionInput')!.value).toBe('Senior Choir');
        table.showActions = true;
        expectBusy(root);
        expect(root.querySelector<HTMLInputElement>('#descriptionInput')!.value).toBe('Senior Choir');

        table.showRowError('ec1', 'Refused.');
        expectIdle(root);
        expect(root.querySelector<HTMLInputElement>('#descriptionInput')!.value).toBe('Senior Choir');
      });

      it('leaves edit when the list is replaced', () => {
        const { table, root } = startSave();

        table.extraCurriculars = [choir];
        expectNoEditRow(root);
      });

      it('does not enter busy for an empty description', () => {
        const table = mount<PmExtraCurricularTable>('pm-extra-curricular-table');
        table.showActions = true;
        table.extraCurriculars = [choir];
        const root = table.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('#descriptionInput')!, '');
        buttonNamed(root, 'Save').click();

        expectIdle(root);
      });
    });

    describe('users table', () => {
      function startSave(): { table: PmUsersTable; root: ShadowRoot; request: ReturnType<typeof pending> } {
        const request = pending();
        mockUpdateUserRoles.mockReturnValue(request.promise);
        const table = mount<PmUsersTable>('pm-users-table');
        table.users = [user()];
        const root = table.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        root.querySelector<HTMLInputElement>('input[type="checkbox"][value="Coordinator"]')!.click();
        buttonNamed(root, 'Save').click();
        return { table, root, request };
      }

      const coordinatorBox = (root: ShadowRoot): HTMLInputElement =>
        root.querySelector<HTMLInputElement>('input[type="checkbox"][value="Coordinator"]')!;

      it('shows busy and keeps the ticked roles across a filter re-render', () => {
        const { root } = startSave();

        expectBusy(root);
        expect(coordinatorBox(root).checked).toBe(true);
        root.querySelector<HTMLButtonElement>('[data-value="all"]')!.click();
        expectBusy(root);
        expect(coordinatorBox(root).checked).toBe(true);
      });

      it('leaves edit when the request resolves', async () => {
        const { root, request } = startSave();

        request.resolve({ userId: 'u1', email: 'teacher@test.com', roles: ['Teacher', 'Coordinator'], isActive: true });
        await tick();

        expectNoEditRow(root);
        expect(root.querySelector('tbody')!.textContent).toContain('Coordinator');
      });

      it('restores Save, resets the roles and shows the error above the user when the request rejects', async () => {
        const { root, request } = startSave();

        request.reject(new AdminError('Refused.', 400));
        await tick();

        expectIdle(root);
        expect(coordinatorBox(root).checked).toBe(false);
        const userRow = root.querySelector('tr[data-user-id="u1"]')!;
        const errorRow = userRow.previousElementSibling!;
        expect(errorRow.classList.contains('users-table__error-row')).toBe(true);
        expect(errorRow.textContent).toContain('Refused.');
      });

      it('does not enter busy when no role is ticked', () => {
        const table = mount<PmUsersTable>('pm-users-table');
        table.users = [user()];
        const root = table.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        root.querySelector<HTMLInputElement>('input[type="checkbox"][value="Teacher"]')!.click();
        buttonNamed(root, 'Save').click();

        expectIdle(root);
        expect(mockUpdateUserRoles).not.toHaveBeenCalled();
      });

      it('does not leave another row showing busy when the edit moves', () => {
        const request = pending();
        mockUpdateUserRoles.mockReturnValue(request.promise);
        const table = mount<PmUsersTable>('pm-users-table');
        table.users = [user(), user({ userId: 'u2', email: 'second@test.com' })];
        const root = table.shadowRoot!;
        buttonNamed(root.querySelector('tr[data-user-id="u1"]')!, 'Edit').click();
        buttonNamed(root, 'Save').click();
        expectBusy(root);

        buttonNamed(root.querySelector('tr[data-user-id="u2"]')!, 'Edit').click();

        expectIdle(root);
      });
    });

    describe('relationship list', () => {
      function startSave(): { list: PmRelationshipList; root: ShadowRoot } {
        const list = mount<PmRelationshipList>('pm-relationship-list');
        list.relationships = [mother];
        const root = list.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('.relationship-list__edit-input')!, 'Stepmother');
        buttonNamed(root, 'Save').click();
        return { list, root };
      }

      it('shows busy with the name kept and restores on endSave', () => {
        const { list, root } = startSave();

        expectBusy(root);
        expect(root.querySelector<HTMLInputElement>('.relationship-list__edit-input')!.value).toBe('Stepmother');

        list.endSave();
        expectIdle(root);
        expect(root.querySelector<HTMLInputElement>('.relationship-list__edit-input')!.value).toBe('Stepmother');
      });

      it('leaves edit when the list is replaced', () => {
        const { list, root } = startSave();

        list.relationships = [{ ...mother, name: 'Stepmother' }];
        expectNoEditRow(root);
      });

      it('does not enter busy for an empty name', () => {
        const list = mount<PmRelationshipList>('pm-relationship-list');
        list.relationships = [mother];
        const root = list.shadowRoot!;
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('.relationship-list__edit-input')!, '');
        buttonNamed(root, 'Save').click();

        expectIdle(root);
      });

      it('endSave does nothing when no save is running', () => {
        const list = mount<PmRelationshipList>('pm-relationship-list');
        list.relationships = [mother];
        const root = list.shadowRoot!;
        buttonNamed(root, 'Edit').click();

        list.endSave();

        expectIdle(root);
      });
    });

    describe('guardian list', () => {
      function mountList(isPersisted: boolean): { list: PmGuardianList; root: ShadowRoot } {
        const list = mount<PmGuardianList>('pm-guardian-list');
        list.relationships = [mother];
        list.isPersisted = isPersisted;
        list.guardians = [guardian];
        return { list, root: list.shadowRoot! };
      }

      const firstNameOf = (root: ShadowRoot): string =>
        root.querySelector<HTMLInputElement>('.guardian-list__edit-name input')!.value;

      function startSave(): { list: PmGuardianList; root: ShadowRoot } {
        const { list, root } = mountList(true);
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('.guardian-list__edit-name input')!, 'Nomsa');
        buttonNamed(root, 'Save').click();
        return { list, root };
      }

      it('shows busy, keeps every entry across a re-render and restores on endSave', () => {
        const { list, root } = startSave();

        expectBusy(root);
        expect(firstNameOf(root)).toBe('Nomsa');
        list.guardians = [guardian];
        expectBusy(root);
        expect(firstNameOf(root)).toBe('Nomsa');

        list.endSave();
        expectIdle(root);
        expect(firstNameOf(root)).toBe('Nomsa');
      });

      it('leaves edit and busy when exitEditMode runs', () => {
        const { list, root } = startSave();

        list.exitEditMode();

        expectNoEditRow(root);
        expect(root.querySelector('[aria-busy="true"]')).toBeNull();
      });

      it('does not enter busy for an empty first name', () => {
        const { root } = mountList(true);
        buttonNamed(root, 'Edit').click();
        type(root.querySelector<HTMLInputElement>('.guardian-list__edit-name input')!, '');
        buttonNamed(root, 'Save').click();

        expectIdle(root);
      });

      it('does not enter busy for a staged row, which sends no request', () => {
        const { list, root } = mountList(false);
        const saved = vi.fn();
        list.addEventListener('guardian-edit-saved', saved);
        buttonNamed(root, 'Edit').click();
        buttonNamed(root, 'Save').click();

        expect(saved).toHaveBeenCalledTimes(1);
        expectIdle(root);
      });
    });

    describe('enrollment list', () => {
      function mountList(isPersisted: boolean): { list: PmEnrollmentList; root: ShadowRoot } {
        const list = mount<PmEnrollmentList>('pm-enrollment-list');
        list.courses = [instrumentCourse];
        list.teachers = [thabo, lindiwe];
        list.isPersisted = isPersisted;
        list.enrollments = [enrollment];
        return { list, root: list.shadowRoot! };
      }

      const selects = (root: ShadowRoot): HTMLSelectElement[] => Array.from(root.querySelectorAll('select'));
      const teacherOf = (root: ShadowRoot): string => {
        const all = selects(root);
        return all[all.length - 3].value;
      };

      function startSave(): { list: PmEnrollmentList; root: ShadowRoot } {
        const { list, root } = mountList(true);
        buttonNamed(root, 'Edit').click();
        const all = selects(root);
        type(all[all.length - 3], 't2');
        buttonNamed(root, 'Save').click();
        return { list, root };
      }

      it('shows busy, keeps every entry across a re-render and restores on endSave', () => {
        const { list, root } = startSave();

        expectBusy(root);
        expect(teacherOf(root)).toBe('t2');
        list.teachers = [thabo, lindiwe];
        expectBusy(root);
        expect(teacherOf(root)).toBe('t2');

        list.endSave();
        expectIdle(root);
        expect(teacherOf(root)).toBe('t2');
      });

      it('leaves edit and busy when exitEditMode runs', () => {
        const { list, root } = startSave();

        list.exitEditMode();

        expectNoEditRow(root);
        expect(root.querySelector('[aria-busy="true"]')).toBeNull();
      });

      it('does not enter busy for a staged row, which sends no request', () => {
        const { list, root } = mountList(false);
        const saved = vi.fn();
        list.addEventListener('enrollment-edit-saved', saved);
        buttonNamed(root, 'Edit').click();
        buttonNamed(root, 'Save').click();

        expect(saved).toHaveBeenCalledTimes(1);
        expectIdle(root);
      });
    });
  });
});

describe('tables and lists adopt the compact stylesheet and label the Actions column', { tags: ['380UC12'] }, () => {
  function lastCell(row: Element): Element {
    return row.lastElementChild!;
  }

  function expectActionsHead(root: ShadowRoot): void {
    const heads = Array.from(root.querySelectorAll('thead th'));
    const last = heads[heads.length - 1];
    expect(last.textContent).toBe('Actions');
    expect(last.classList.contains('compact-actions-col')).toBe(true);
  }

  function expectRowCellsClassed(root: ParentNode): void {
    const containers = Array.from(root.querySelectorAll('tbody [data-testid="row-actions"]'));
    expect(containers.length).toBeGreaterThan(0);
    for (const container of containers) {
      const cell = container.closest('td')!;
      expect(cell.classList.contains('compact-actions-col')).toBe(true);
      expect(lastCell(cell.parentElement!)).toBe(cell);
    }
  }

  function expectAdopted(root: ShadowRoot): void {
    expect(root.adoptedStyleSheets).toContain(compactButtonStyles);
  }

  it('students table, with the summary row left unclassed', () => {
    const table = mount<PmStudentsTable>('pm-students-table');
    table.students = [student];
    const root = table.shadowRoot!;
    root.querySelector<HTMLButtonElement>('.students-table__chevron-btn')!.click();
    table.markSummaryLoaded('s1');

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
    const summaryCell = root.querySelector('tr.students-table__summary-row td')!;
    expect(summaryCell.classList.contains('compact-actions-col')).toBe(false);
  });

  it('users table, with the error row left unclassed', async () => {
    const request = Promise.reject(new AdminError('Refused.', 400));
    request.catch(() => undefined);
    mockUpdateUserRoles.mockReturnValue(request);
    const table = mount<PmUsersTable>('pm-users-table');
    table.users = [user()];
    const root = table.shadowRoot!;
    buttonNamed(root, 'Edit').click();
    buttonNamed(root, 'Save').click();
    await tick();

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
    const errorCell = root.querySelector('tr.users-table__error-row td')!;
    expect(errorCell.classList.contains('compact-actions-col')).toBe(false);
  });

  it('course table, with the error row left unclassed', () => {
    const table = mount<PmCourseTable>('pm-course-table');
    table.showActions = true;
    table.courses = [course];
    table.showRowError('c1', 'Refused.');
    const root = table.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
    expect(root.querySelector('tr.course-table__error-row td')!.classList.contains('compact-actions-col')).toBe(false);
  });

  it('extra-curricular table, with the error and panel rows left unclassed', () => {
    const table = mount<PmExtraCurricularTable>('pm-extra-curricular-table');
    table.showActions = true;
    table.extraCurriculars = [choir];
    const root = table.shadowRoot!;
    root.querySelector<HTMLButtonElement>('.ec-table__chevron')!.click();
    table.showRowError('ec1', 'Refused.');

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
    expect(root.querySelector('tr.ec-table__error-row td')!.classList.contains('compact-actions-col')).toBe(false);
    const panelCell = root.querySelector('td.ec-table__panel')!;
    expect(panelCell.classList.contains('compact-actions-col')).toBe(false);

    const panel = panelCell.querySelector('pm-extra-curricular-practice-times')!;
    const panelRoot = panel.shadowRoot!;
    expectAdopted(panelRoot);
    expectActionsHead(panelRoot);
    expectRowCellsClassed(panelRoot);
  });

  it('saved reports table', () => {
    const table = mount('pm-saved-reports-table') as HTMLElement & { reports: SavedReportSummary[] };
    table.reports = [{ id: 'r1', name: 'Mine', createdBy: 'me@test.com', isOwner: true, lastRunAt: null }];
    const root = table.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
  });

  it('waiting list table', () => {
    const table = mount<PmWaitingListTable>('pm-waiting-list-table');
    table.showActions = true;
    table.groups = [
      {
        occurrenceType: 'DuringSchool',
        count: 1,
        entries: [
          {
            waitingListEntryId: 'w1',
            studentId: 's1',
            firstName: 'Amara',
            lastName: 'Pillay',
            position: 1,
            lessonType: 'Individual',
            durationType: 'HalfHour',
            instrumentType: 'Piano',
            notes: null,
            addedAt: '2026-02-01T08:00:00Z',
          },
        ],
      },
    ];
    const root = table.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
  });

  it('sessions table, offering no actions on the current session', () => {
    const table = mount('pm-sessions-table') as HTMLElement & { sessions: SessionResult[] };
    const base = {
      sessionStartedAt: '2024-01-01T00:00:00Z',
      lastSeenAt: '2024-01-02T00:00:00Z',
      expiresAt: '2024-01-08T00:00:00Z',
      deviceLabel: 'Firefox',
      ipAddress: '10.0.0.1',
    };
    table.sessions = [
      { ...base, tokenId: 'a', isCurrent: false },
      { ...base, tokenId: 'b', isCurrent: true },
    ];
    const root = table.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
    const rows = Array.from(root.querySelectorAll('tbody tr'));
    expect(lastCell(rows[1]).classList.contains('compact-actions-col')).toBe(true);
    expect(rows[1].querySelector('button')).toBeNull();
    const revoke = rows[0].querySelector('button')!;
    expect(labelOf(revoke)).toBe('Revoke');
    expect(isDestructive(revoke)).toBe(true);
  });

  it('teacher table and row', () => {
    const table = mount('pm-teacher-table') as HTMLElement & { teachers: TeacherResult[] };
    table.teachers = [
      {
        teacherId: 't1',
        firstName: 'Naomi',
        surname: 'Fischer',
        isPrivate: false,
        isActive: true,
        linkedAccountId: null,
        linkedAccountEmail: null,
        banking: null,
      },
    ];
    const root = table.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    const rowRoot = root.querySelector('pm-teacher-row')!.shadowRoot!;
    expectAdopted(rowRoot);
    const actions = rowRoot.querySelector('[data-testid="row-actions"]')!;
    expect(labelsIn(actions)).toEqual(['Open']);
    expect(actions.closest('td')!.classList.contains('compact-actions-col')).toBe(true);
  });

  it('relationship list', () => {
    const list = mount<PmRelationshipList>('pm-relationship-list');
    list.relationships = [mother];
    const root = list.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
  });

  it('guardian list', () => {
    const list = mount<PmGuardianList>('pm-guardian-list');
    list.relationships = [mother];
    list.guardians = [guardian];
    const root = list.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
  });

  it('enrollment list', () => {
    const list = mount<PmEnrollmentList>('pm-enrollment-list');
    list.enrollments = [enrollment];
    const root = list.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
  });

  it('sibling list', () => {
    const list = mount<PmSiblingList>('pm-sibling-list');
    list.siblings = [{ ...student, studentId: 's2', population: 'Enrolled' }];
    const root = list.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
    expectRowCellsClassed(root);
  });

  it('extra-curriculars step', () => {
    const step = mount('pm-extra-curriculars-step');
    const root = step.shadowRoot!;

    expectAdopted(root);
    expectActionsHead(root);
  });

  it('record action components', () => {
    for (const tag of [
      'pm-banking-section',
      'pm-teacher-profile-section',
      'pm-my-details-modal',
      'pm-user-created-banner',
      'pm-reinvite-banner',
    ]) {
      expectAdopted(mount(tag).shadowRoot!);
    }
  });

  describe('local sheets declare no rule for a removed button class', () => {
    const cases: Array<[string, string[]]> = [
      ['pm-students-table', ['students-table__btn', 'students-table__actions']],
      ['pm-users-table', ['users-table__btn', 'users-table__regenerate', 'users-table__actions']],
      ['pm-course-table', ['course-table__btn']],
      ['pm-extra-curricular-table', ['ec-table__btn']],
      [
        'pm-saved-reports-table',
        ['saved-reports-table__run', 'saved-reports-table__edit', 'saved-reports-table__delete'],
      ],
      ['pm-waiting-list-table', ['wl-table__btn']],
      ['pm-sessions-table', ['sessions-table__btn', 'sessions-table__actions']],
      ['pm-teacher-table', ['teacher-table__actions-header']],
      ['pm-relationship-list', ['relationship-list__btn', 'relationship-list__actions']],
      ['pm-guardian-list', ['guardian-list__btn', 'guardian-list__actions']],
      ['pm-enrollment-list', ['enrollment-list__btn', 'enrollment-list__actions']],
      ['pm-sibling-list', ['sibling-list__remove-btn', 'sibling-list__actions']],
      ['pm-extra-curricular-practice-times', ['ec-panel__remove', 'ec-panel__actions']],
      ['pm-extra-curriculars-step', ['ec-step__remove']],
      ['pm-banking-section', ['banking__btn--danger', 'banking__btn--icon', 'banking__btn-icon', 'banking__actions']],
      ['pm-teacher-profile-section', ['profile-section__edit-btn']],
      ['pm-my-details-modal', ['my-details__edit-btn']],
      ['pm-user-created-banner', ['banner__copy']],
      ['pm-reinvite-banner', ['banner__copy']],
    ];

    it.each(cases)('%s', (tag, removed) => {
      const sheets = mount(tag).shadowRoot!.adoptedStyleSheets;
      const text = Array.from(sheets[sheets.length - 1].cssRules)
        .map((rule) => rule.cssText)
        .join('\n');

      for (const name of removed) expect(text).not.toContain(name);
    });

    it('the teacher row', () => {
      const row = document.createElement('pm-teacher-row');
      const sheets = row.shadowRoot!.adoptedStyleSheets;
      const text = Array.from(sheets[sheets.length - 1].cssRules)
        .map((rule) => rule.cssText)
        .join('\n');

      expect(text).not.toContain('teacher-row__btn');
      expect(text).not.toContain('teacher-row__actions');
    });
  });

  beforeEach(() => {
    mockUpdateUserRoles.mockReset();
  });
});
