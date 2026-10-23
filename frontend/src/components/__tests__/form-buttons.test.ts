import { afterEach, describe, expect, it } from 'vitest';
import { formButtonStyles } from '../form-button-styles';
import '../../features/teachers/components/pm-teacher-profile-form';
import '../../features/teachers/components/pm-teacher-create-section';
import '../../features/courses/components/pm-course-form';
import '../../features/students/components/pm-relationship-form';
import '../../features/extra-curriculars/components/pm-extra-curricular-form';
import '../../features/extra-curriculars/components/pm-extra-curricular-practice-times';
import '../../features/teachers/components/pm-banking-section';
import '../../features/students/components/pm-guardians-step';
import '../../features/students/components/pm-courses-step';
import '../../features/students/components/pm-siblings-step';
import '../../features/students/components/pm-extra-curriculars-step';
import '../../features/students/components/pm-enrol-waiting-list-student-modal';
import '../../features/reports/components/pm-save-report-modal';
import '../../features/teachers/components/pm-link-account-modal';
import '../../features/teachers/components/pm-banking-activity-modal';
import '../../features/admin/components/pm-create-user-form';
import '../../features/teachers/components/pm-my-details-modal';

interface Harness {
  host: HTMLElement;
  confirm: HTMLButtonElement;
  cancel: HTMLButtonElement | null;
  event: string;
  fill(): void;
  makeInvalid?(): void;
  fail(): void;
  succeed(): void;
  idleDisabled?: boolean;
}

interface Case {
  name: string;
  tag: string;
  mount(): Harness;
}

const mounted: HTMLElement[] = [];

function create(tag: string): HTMLElement {
  const element = document.createElement(tag);
  document.body.appendChild(element);
  mounted.push(element);
  return element;
}

function byId<T extends HTMLElement>(root: ShadowRoot, id: string): T {
  return root.getElementById(id) as T;
}

function call(target: HTMLElement, method: string, ...args: unknown[]): unknown {
  return (target as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args);
}

function type(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function labelOf(button: HTMLElement): string {
  return Array.from(button.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join('')
    .trim();
}

function firstOption(select: HTMLSelectElement): string {
  return Array.from(select.options).find((option) => option.value !== '')!.value;
}

const teacher = {
  teacherId: 't1',
  firstName: 'Thandi',
  surname: 'Mokoena',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
  banking: { bank: 'Capitec', accountType: 'Savings', branchCode: '470010', accountNumberLast4: '1234' },
};

const stepCourse = {
  courseId: 'c-theory',
  courseType: 'Theory',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'AfterSchool',
};

const stepTeacher = { teacherId: 't1', firstName: 'Thabo', surname: 'Nkosi', isActive: true };

function stubValidity(root: ShadowRoot): void {
  const form = root.querySelector('form')!;
  form.reportValidity = () => form.checkValidity();
}

const cases: Case[] = [
  {
    name: 'teacher profile form',
    tag: 'pm-teacher-profile-form',
    mount() {
      const host = create('pm-teacher-profile-form');
      call(host, 'populate', teacher);
      const root = host.shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'saveBtn'),
        cancel: byId<HTMLButtonElement>(root, 'cancelBtn'),
        event: 'teacher-profile-update-requested',
        fill: () => undefined,
        makeInvalid: () => type(byId(root, 'firstName'), ''),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'setBusy', false),
      };
    },
  },
  {
    name: 'teacher create section',
    tag: 'pm-teacher-create-section',
    mount() {
      const host = create('pm-teacher-create-section');
      const root = host.shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'saveBtn'),
        cancel: null,
        event: 'teacher-create-requested',
        fill: () => {
          type(byId(root, 'firstName'), 'Thandi');
          type(byId(root, 'surname'), 'Mokoena');
        },
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'reset'),
      };
    },
  },
  {
    name: 'course form',
    tag: 'pm-course-form',
    mount() {
      const host = create('pm-course-form');
      (host as unknown as { structures: unknown }).structures = [
        { lessonStructureId: 'ls1', lessonType: 'Group', durationType: 'Hour', occurrenceType: 'AfterSchool' },
      ];
      const root = host.shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'createBtn'),
        cancel: null,
        event: 'course-form-submitted',
        fill: () => {
          type(byId(root, 'courseType'), firstOption(byId(root, 'courseType')));
          type(byId(root, 'cost'), '120.00');
          type(byId(root, 'lessonStructure'), firstOption(byId(root, 'lessonStructure')));
        },
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'reset'),
      };
    },
  },
  {
    name: 'relationship form',
    tag: 'pm-relationship-form',
    mount() {
      const host = create('pm-relationship-form');
      const root = host.shadowRoot!;
      stubValidity(root);
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'saveBtn'),
        cancel: null,
        event: 'relationship-form-submitted',
        fill: () => type(byId(root, 'name'), 'Aunt'),
        makeInvalid: () => type(byId(root, 'name'), ''),
        fail: () => call(host, 'setBusy', false),
        succeed: () => call(host, 'reset'),
      };
    },
  },
  {
    name: 'extra-curricular form',
    tag: 'pm-extra-curricular-form',
    mount() {
      const host = create('pm-extra-curricular-form');
      const root = host.shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'createBtn'),
        cancel: null,
        event: 'extra-curricular-form-submitted',
        fill: () => {
          type(byId(root, 'description'), 'Marimba Band');
          type(byId(root, 'phase'), firstOption(byId(root, 'phase')));
          type(byId(root, 'startTime'), '07:15');
          byId<HTMLButtonElement>(root, 'addBtn').click();
        },
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'reset'),
      };
    },
  },
  {
    name: 'practice-time panel',
    tag: 'pm-extra-curricular-practice-times',
    mount() {
      const host = create('pm-extra-curricular-practice-times');
      (host as unknown as { showActions: boolean }).showActions = true;
      (host as unknown as { extraCurricular: unknown }).extraCurricular = {
        extraCurricularId: 'e1',
        description: 'Choir',
        phase: 'Junior',
        practiceTimes: [{ practiceTimeId: 'p1', day: 'Monday', startTime: '07:15:00' }],
      };
      const root = host.shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'addBtn'),
        cancel: null,
        event: 'extra-curricular-practice-time-add-requested',
        fill: () => {
          type(byId(root, 'day'), 'Wednesday');
          type(byId(root, 'startTime'), '14:30');
        },
        makeInvalid: () => type(byId(root, 'startTime'), ''),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'setBusy', false),
      };
    },
  },
  {
    name: 'banking details form',
    tag: 'pm-banking-section',
    mount() {
      const host = create('pm-banking-section');
      host.setAttribute('self-service', '');
      (host as unknown as { teacher: unknown }).teacher = teacher;
      const root = host.shadowRoot!;
      byId<HTMLButtonElement>(root, 'editBtn').click();
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'submitBtn'),
        cancel: byId<HTMLButtonElement>(root, 'cancelBtn'),
        event: 'teacher-banking-save-requested',
        fill: () => undefined,
        makeInvalid: () => type(byId(root, 'branchCodeInput'), '12'),
        fail: () => call(host, 'showFormError', 'Refused.'),
        succeed: () => call(host, 'closeForm'),
      };
    },
  },
  {
    name: 'guardian form in the guardians step',
    tag: 'pm-guardians-step',
    mount() {
      const host = create('pm-guardians-step');
      (host as unknown as { relationships: unknown }).relationships = [
        { guardianRelationshipId: 'r1', name: 'Mother' },
      ];
      call(host, 'activate', 's1');
      const root = host.shadowRoot!;
      byId<HTMLButtonElement>(root, 'addBtn').click();
      const formRoot = byId(root, 'guardianForm').shadowRoot!;
      stubValidity(formRoot);
      return {
        host,
        confirm: byId<HTMLButtonElement>(formRoot, 'confirmBtn'),
        cancel: byId<HTMLButtonElement>(formRoot, 'cancelBtn'),
        event: 'guardian-add-requested',
        fill: () => {
          type(byId(formRoot, 'firstName'), 'Sipho');
          type(byId(formRoot, 'surname'), 'Dlamini');
          type(byId(formRoot, 'relationship'), 'r1');
        },
        makeInvalid: () => type(byId(formRoot, 'firstName'), ''),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'closeForm'),
      };
    },
  },
  {
    name: 'enrollment form in the courses step',
    tag: 'pm-courses-step',
    mount() {
      const host = create('pm-courses-step');
      (host as unknown as { courses: unknown }).courses = [stepCourse];
      (host as unknown as { teachers: unknown }).teachers = [stepTeacher];
      call(host, 'activate', 's1');
      const root = host.shadowRoot!;
      byId<HTMLButtonElement>(root, 'enrollBtn').click();
      const formRoot = byId(root, 'enrollmentForm').shadowRoot!;
      stubValidity(formRoot);
      return {
        host,
        confirm: byId<HTMLButtonElement>(formRoot, 'confirmBtn'),
        cancel: byId<HTMLButtonElement>(formRoot, 'cancelBtn'),
        event: 'enrollment-add-requested',
        fill: () => {
          type(byId(formRoot, 'course'), 'c-theory');
          type(byId(formRoot, 'teacher'), 't1');
          type(byId(formRoot, 'step'), firstOption(byId(formRoot, 'step')));
        },
        makeInvalid: () => type(byId(formRoot, 'teacher'), ''),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'closeForm'),
      };
    },
  },
  {
    name: 'sibling search in the siblings step',
    tag: 'pm-siblings-step',
    mount() {
      const host = create('pm-siblings-step');
      call(host, 'activate', 's1');
      (host as unknown as { candidates: unknown }).candidates = [
        { studentId: 's2', firstName: 'Ayesha', lastName: 'Khan', population: 'Enrolled' },
      ];
      const searchRoot = byId(host.shadowRoot!, 'searchSelect').shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(searchRoot, 'addBtn'),
        cancel: null,
        event: 'sibling-add-requested',
        fill: () => {
          type(byId(searchRoot, 'query'), 'Aye');
          searchRoot.querySelector<HTMLButtonElement>('.search-select__result')!.click();
        },
        fail: () => call(host, 'showError', 'Refused.'),
        idleDisabled: true,
        succeed: () => {
          (host as unknown as { candidates: unknown }).candidates = [];
        },
      };
    },
  },
  {
    name: 'assign panel in the extra-curriculars step',
    tag: 'pm-extra-curriculars-step',
    mount() {
      const host = create('pm-extra-curriculars-step');
      call(host, 'activate', 's1', 'Junior');
      const root = host.shadowRoot!;
      byId<HTMLButtonElement>(root, 'addBtn').click();
      (host as unknown as { assignable: unknown }).assignable = [
        { extraCurricularId: 'e1', description: 'Choir', phase: 'Junior', practiceTimes: [] },
      ];
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'assignBtn'),
        cancel: byId<HTMLButtonElement>(root, 'cancelBtn'),
        event: 'extra-curricular-assign-requested',
        fill: () => type(byId(root, 'activitySelect'), 'e1'),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'closePanel'),
      };
    },
  },
  {
    name: 'enrol waiting-list student modal',
    tag: 'pm-enrol-waiting-list-student-modal',
    mount() {
      const host = create('pm-enrol-waiting-list-student-modal');
      (host as unknown as { lessonStructures: unknown }).lessonStructures = [
        {
          lessonStructureId: 'ls1',
          lessonType: 'Individual',
          durationType: 'HalfHour',
          occurrenceType: 'DuringSchool',
        },
      ];
      (host as unknown as { teachers: unknown }).teachers = [stepTeacher];
      call(
        host,
        'show',
        {
          waitingListEntryId: 'w1',
          studentId: 's1',
          firstName: 'Ayesha',
          lastName: 'Khan',
          position: 1,
          lessonType: 'Individual',
          durationType: 'HalfHour',
          instrumentType: 'Piano',
          notes: null,
          addedAt: '2026-01-01',
        },
        'DuringSchool',
      );
      const root = host.shadowRoot!;
      stubValidity(root);
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'confirmBtn'),
        cancel: byId<HTMLButtonElement>(root, 'cancelBtn'),
        event: 'waiting-list-enrol-confirmed',
        fill: () => {
          type(byId(root, 'teacher'), 't1');
          type(byId(root, 'step'), firstOption(byId(root, 'step')));
        },
        makeInvalid: () => type(byId(root, 'teacher'), ''),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'close'),
      };
    },
  },
  {
    name: 'save report modal',
    tag: 'pm-save-report-modal',
    mount() {
      const host = create('pm-save-report-modal');
      call(host, 'show', '');
      const root = host.shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'saveBtn'),
        cancel: byId<HTMLButtonElement>(root, 'cancelBtn'),
        event: 'save-report-confirmed',
        fill: () => type(byId(root, 'nameInput'), 'Grade 4 Contacts'),
        fail: () => {
          call(host, 'setBusy', false);
          call(host, 'showError', 'Refused.');
        },
        succeed: () => {
          call(host, 'setBusy', false);
          call(host, 'close');
        },
      };
    },
  },
  {
    name: 'link account modal',
    tag: 'pm-link-account-modal',
    mount() {
      const host = create('pm-link-account-modal');
      call(host, 'show', [{ accountId: 'a1', email: 'teacher@test.com' }]);
      const root = host.shadowRoot!;
      const picker = byId(root, 'picker').shadowRoot!;
      return {
        host,
        confirm: byId<HTMLButtonElement>(root, 'linkBtn'),
        cancel: byId<HTMLButtonElement>(root, 'cancelBtn'),
        event: 'teacher-account-link-confirmed',
        fill: () => type(byId(picker, 'account'), 'a1'),
        fail: () => call(host, 'showError', 'Refused.'),
        succeed: () => call(host, 'close'),
      };
    },
  },
];

function submit(harness: Harness): Event[] {
  const events: Event[] = [];
  harness.host.addEventListener(harness.event, (event) => events.push(event));
  harness.fill();
  harness.confirm.click();
  return events;
}

function expectBusy(harness: Harness, label: string): void {
  expect(harness.confirm.disabled).toBe(true);
  expect(harness.confirm.getAttribute('aria-busy')).toBe('true');
  expect(labelOf(harness.confirm)).toBe(label);
  expect((harness.confirm.firstElementChild as HTMLElement).dataset.testid).toBe('button-loading-icon');
  expect(harness.confirm.querySelectorAll('[data-testid="button-loading-icon"]')).toHaveLength(1);
  if (harness.cancel) expect(harness.cancel.disabled).toBe(true);
}

function expectRestored(harness: Harness, label: string, disabled = false): void {
  expect(harness.confirm.disabled).toBe(disabled);
  expect(harness.confirm.hasAttribute('aria-busy')).toBe(false);
  expect(harness.confirm.querySelector('[data-testid="button-loading-icon"]')).toBeNull();
  expect(labelOf(harness.confirm)).toBe(label);
  if (harness.cancel) expect(harness.cancel.disabled).toBe(false);
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

describe('form confirm actions enter the loading state', { tags: ['378UC1'] }, () => {
  it.each(cases)('$name disables the confirm action, shows the loading icon and disables Cancel', (testCase) => {
    const harness = testCase.mount();
    const label = labelOf(harness.confirm);

    const events = submit(harness);

    expect(events).toHaveLength(1);
    expectBusy(harness, label);
  });

  it.each(cases.filter((c) => c.name !== 'relationship form'))(
    '$name sends nothing and is not busy when the click fails validation',
    (testCase) => {
      const harness = testCase.mount();
      if (!harness.makeInvalid) return;
      const label = labelOf(harness.confirm);
      const events: Event[] = [];
      harness.host.addEventListener(harness.event, (event) => events.push(event));

      harness.fill();
      harness.makeInvalid();
      harness.confirm.click();

      expect(events).toHaveLength(0);
      expectRestored(harness, label);
    },
  );

  it('a create-mode wizard step stages a guardian, an enrollment and an assignment without entering busy', () => {
    for (const tag of ['pm-guardians-step', 'pm-courses-step', 'pm-extra-curriculars-step'] as const) {
      const host = create(tag);
      const root = host.shadowRoot!;
      if (tag === 'pm-guardians-step') {
        (host as unknown as { relationships: unknown }).relationships = [
          { guardianRelationshipId: 'r1', name: 'Mother' },
        ];
        call(host, 'activateForCreate');
        byId<HTMLButtonElement>(root, 'addBtn').click();
        const formRoot = byId(root, 'guardianForm').shadowRoot!;
        type(byId(formRoot, 'firstName'), 'Sipho');
        type(byId(formRoot, 'surname'), 'Dlamini');
        type(byId(formRoot, 'relationship'), 'r1');
        byId<HTMLButtonElement>(formRoot, 'confirmBtn').click();
        expect(byId(formRoot, 'confirmBtn').hasAttribute('aria-busy')).toBe(false);
        expect(byId<HTMLButtonElement>(formRoot, 'confirmBtn').disabled).toBe(false);
      } else if (tag === 'pm-courses-step') {
        (host as unknown as { courses: unknown }).courses = [stepCourse];
        (host as unknown as { teachers: unknown }).teachers = [stepTeacher];
        call(host, 'activateForCreate');
        byId<HTMLButtonElement>(root, 'enrollBtn').click();
        const formRoot = byId(root, 'enrollmentForm').shadowRoot!;
        type(byId(formRoot, 'course'), 'c-theory');
        type(byId(formRoot, 'teacher'), 't1');
        type(byId(formRoot, 'step'), firstOption(byId(formRoot, 'step')));
        byId<HTMLButtonElement>(formRoot, 'confirmBtn').click();
        expect(byId(formRoot, 'confirmBtn').hasAttribute('aria-busy')).toBe(false);
        expect(byId<HTMLButtonElement>(formRoot, 'confirmBtn').disabled).toBe(false);
      } else {
        call(host, 'activateForCreate', 'Junior');
        byId<HTMLButtonElement>(root, 'addBtn').click();
        (host as unknown as { assignable: unknown }).assignable = [
          { extraCurricularId: 'e1', description: 'Choir', phase: 'Junior', practiceTimes: [] },
        ];
        type(byId(root, 'activitySelect'), 'e1');
        byId<HTMLButtonElement>(root, 'assignBtn').click();
        expect(byId(root, 'assignBtn').hasAttribute('aria-busy')).toBe(false);
        expect(byId<HTMLButtonElement>(root, 'assignBtn').disabled).toBe(false);
      }
    }
  });

  it('the banking form keeps the loading icon and busy state when a teacher assignment re-renders it', () => {
    const harness = cases.find((c) => c.tag === 'pm-banking-section')!.mount();
    const label = labelOf(harness.confirm);
    submit(harness);

    (harness.host as unknown as { teacher: unknown }).teacher = { ...teacher };

    expectBusy(harness, label);
  });
});

describe('form confirm actions are restored when the request ends', { tags: ['378UC2'] }, () => {
  it.each(cases)('$name keeps the entered values and restores both actions after a failure', (testCase) => {
    const harness = testCase.mount();
    const label = labelOf(harness.confirm);
    submit(harness);

    harness.fail();

    expectRestored(harness, label);
  });

  it.each(cases)('$name leaves the loading state on success', (testCase) => {
    const harness = testCase.mount();
    const label = labelOf(harness.confirm);
    submit(harness);

    harness.succeed();

    expectRestored(harness, label, harness.idleDisabled ?? false);
  });

  it('the teacher profile form keeps the entered names and shows the message after a failure', () => {
    const harness = cases.find((c) => c.tag === 'pm-teacher-profile-form')!.mount();
    const root = harness.host.shadowRoot!;
    type(byId(root, 'firstName'), 'Renamed');
    harness.confirm.click();

    harness.fail();

    expect(byId<HTMLInputElement>(root, 'firstName').value).toBe('Renamed');
    expect(byId(root, 'formError').textContent).toBe('Refused.');
  });

  it('the sibling search stays disabled while busy when the query is typed again', () => {
    const harness = cases.find((c) => c.tag === 'pm-siblings-step')!.mount();
    const label = labelOf(harness.confirm);
    submit(harness);
    const searchRoot = byId(harness.host.shadowRoot!, 'searchSelect').shadowRoot!;

    type(byId(searchRoot, 'query'), 'Aye');

    expect(harness.confirm.disabled).toBe(true);
    expect(harness.confirm.getAttribute('aria-busy')).toBe('true');
    expect(labelOf(harness.confirm)).toBe(label);
  });

  it('the save report modal keeps the name gate after a failure', () => {
    const harness = cases.find((c) => c.tag === 'pm-save-report-modal')!.mount();
    const root = harness.host.shadowRoot!;
    submit(harness);
    harness.fail();
    expect(harness.confirm.disabled).toBe(false);

    type(byId(root, 'nameInput'), '   ');

    expect(harness.confirm.disabled).toBe(true);
  });
});

describe('form action rows hold Cancel then the confirm action', { tags: ['378UC3'] }, () => {
  const withCancel = cases.filter(
    (c) =>
      ![
        'teacher create section',
        'course form',
        'relationship form',
        'extra-curricular form',
        'practice-time panel',
        'sibling search in the siblings step',
      ].includes(c.name),
  );

  it.each(withCancel)('$name puts Cancel first and the confirm action last', (testCase) => {
    const harness = testCase.mount();
    const row = harness.confirm.parentElement as HTMLElement;

    expect(row.dataset.testid).toBe('form-actions');
    expect(row.classList.contains('form-actions')).toBe(true);
    expect(Array.from(row.children)).toEqual([harness.cancel, harness.confirm]);
    expect(harness.cancel!.classList.contains('form-btn--secondary')).toBe(true);
    expect(harness.confirm.classList.contains('form-btn--primary')).toBe(true);
    expect(row.lastElementChild).toBe(harness.confirm);
  });
});

describe('confirm labels', () => {
  it('the guardian form reads Create Guardian', { tags: ['378UC4'] }, () => {
    const harness = cases.find((c) => c.tag === 'pm-guardians-step')!.mount();

    expect(labelOf(harness.confirm)).toBe('Create Guardian');
  });

  it('the enrollment form reads Enrol Student for a saved and for an unsaved student', { tags: ['378UC5'] }, () => {
    const saved = cases.find((c) => c.tag === 'pm-courses-step')!.mount();
    expect(labelOf(saved.confirm)).toBe('Enrol Student');

    const host = create('pm-courses-step');
    (host as unknown as { courses: unknown }).courses = [stepCourse];
    call(host, 'activateForCreate');
    const formRoot = byId(host.shadowRoot!, 'enrollmentForm').shadowRoot!;
    expect(labelOf(byId(formRoot, 'confirmBtn'))).toBe('Enrol Student');
  });

  it('the banking form reads Save when editing and Create Banking Details when creating', { tags: ['378UC6'] }, () => {
    const editing = cases.find((c) => c.tag === 'pm-banking-section')!.mount();
    expect(labelOf(editing.confirm)).toBe('Save');

    const host = create('pm-banking-section');
    host.setAttribute('self-service', '');
    (host as unknown as { teacher: unknown }).teacher = { ...teacher, banking: null };
    const root = host.shadowRoot!;
    byId<HTMLButtonElement>(root, 'addBtn').click();
    expect(labelOf(byId(root, 'submitBtn'))).toBe('Create Banking Details');
  });

  it('the practice-time panel reads Create Practice Time', { tags: ['378UC7'] }, () => {
    const harness = cases.find((c) => c.tag === 'pm-extra-curricular-practice-times')!.mount();

    expect(labelOf(harness.confirm)).toBe('Create Practice Time');
  });

  it('the sibling search reads Link Student', { tags: ['378UC8'] }, () => {
    const harness = cases.find((c) => c.tag === 'pm-siblings-step')!.mount();

    expect(labelOf(harness.confirm)).toBe('Link Student');
  });

  it('the assign panel reads Assign Activity', { tags: ['378UC9'] }, () => {
    const harness = cases.find((c) => c.tag === 'pm-extra-curriculars-step')!.mount();

    expect(labelOf(harness.confirm)).toBe('Assign Activity');
  });

  it('the banking activity modal dismiss action reads Cancel and no button reads Close', { tags: ['378UC10'] }, () => {
    const modal = create('pm-banking-activity-modal');
    call(modal, 'show', []);
    const labels = Array.from(modal.shadowRoot!.querySelectorAll('button')).map((button) => labelOf(button));

    expect(labelOf(byId(modal.shadowRoot!, 'closeBtn'))).toBe('Cancel');
    expect(labels).not.toContain('Close');
  });
});

describe('forms adopt the shared form button stylesheet', { tags: ['378UC11'] }, () => {
  const deletedClasses = [
    'profile-form__actions',
    'profile-form__save',
    'profile-form__cancel',
    'create-section__actions',
    'create-section__save',
    'create-user__submit',
    'course-form__submit',
    'relationship-form__submit',
    'ec-form__submit',
    'ec-panel__add-button',
    'banking__form-actions',
    'banking__btn--primary',
    'banking__btn--ghost',
    'guardian-form__actions',
    'guardian-form__btn',
    'enrollment-form__actions',
    'enrollment-form__btn',
    'search-select__add-btn',
    'ec-step__panel-actions',
    'ec-step__panel-btn',
    'modal__btn--save',
    'modal__btn--link',
    'modal__btn--primary',
  ];

  function localSheetText(root: ShadowRoot): string {
    const sheets = root.adoptedStyleSheets;
    return Array.from(sheets[sheets.length - 1].cssRules)
      .map((rule) => rule.cssText)
      .join('\n');
  }

  function check(host: HTMLElement): void {
    const roots = [host.shadowRoot!];
    for (const nested of Array.from(host.shadowRoot!.querySelectorAll('*')).filter((e) => e.shadowRoot)) {
      roots.push(nested.shadowRoot!);
    }
    for (const root of roots) {
      const text = localSheetText(root);
      for (const name of deletedClasses) expect(text).not.toContain(name);
    }
    const ownSheets = host.shadowRoot!.adoptedStyleSheets;
    expect(ownSheets.length).toBeGreaterThan(0);
  }

  it.each(cases)('$name has formButtonStyles in the shadow root it renders its buttons in', (testCase) => {
    const harness = testCase.mount();
    const buttonRoot = harness.confirm.getRootNode() as ShadowRoot;

    expect(buttonRoot.adoptedStyleSheets).toContain(formButtonStyles);
    check(harness.host);
  });

  it('the banking activity modal adopts formButtonStyles', () => {
    const modal = create('pm-banking-activity-modal');

    expect(modal.shadowRoot!.adoptedStyleSheets).toContain(formButtonStyles);
    check(modal);
  });

  it('the create user form adopts formButtonStyles', () => {
    const form = create('pm-create-user-form');

    expect(form.shadowRoot!.adoptedStyleSheets).toContain(formButtonStyles);
    check(form);
    expect(byId(form.shadowRoot!, 'submitBtn').classList.contains('form-btn--primary')).toBe(true);
  });
});

describe('inline forms give Cancel the warning variant', { tags: ['387UC1'] }, () => {
  const warningCases = cases.filter((c) => ['teacher profile form', 'banking details form'].includes(c.name));

  it.each(warningCases)('$name Cancel is a secondary warning form button', (testCase) => {
    const harness = testCase.mount();

    expect(harness.cancel!.className).toBe('form-btn form-btn--secondary form-btn--warning');
  });

  it('keeps the warning variant on the teacher profile form Cancel while the form is busy', () => {
    const harness = warningCases[0].mount();

    call(harness.host, 'setBusy', true);

    expect(harness.cancel!.disabled).toBe(true);
    expect(harness.cancel!.classList.contains('form-btn--warning')).toBe(true);
  });

  it('gives Cancel the warning variant in the teacher profile form and banking section inside My details', () => {
    const modal = create('pm-my-details-modal') as HTMLElement & { show(teacher: unknown): void };
    modal.show(teacher);
    const root = modal.shadowRoot!;
    const profile = byId<HTMLElement>(root, 'editForm').shadowRoot!;
    const bankingRoot = byId<HTMLElement>(root, 'bankingSection').shadowRoot!;
    byId<HTMLButtonElement>(bankingRoot, 'editBtn').click();

    expect(byId(profile, 'cancelBtn').classList.contains('form-btn--warning')).toBe(true);
    expect(byId(bankingRoot, 'cancelBtn').classList.contains('form-btn--warning')).toBe(true);
  });
});

describe('Cancel in a form modal or a wizard step form keeps the secondary look', { tags: ['387UC4'] }, () => {
  const keeping = cases.filter((c) =>
    [
      'guardian form in the guardians step',
      'enrollment form in the courses step',
      'assign panel in the extra-curriculars step',
      'enrol waiting-list student modal',
      'save report modal',
      'link account modal',
    ].includes(c.name),
  );

  it.each(keeping)('$name Cancel has no warning variant', (testCase) => {
    const harness = testCase.mount();

    expect(harness.cancel!.classList.contains('form-btn--secondary')).toBe(true);
    expect(harness.cancel!.classList.contains('form-btn--warning')).toBe(false);
  });

  it('the banking activity modal dismiss button has no warning variant', () => {
    const modal = create('pm-banking-activity-modal');

    expect(byId(modal.shadowRoot!, 'closeBtn').classList.contains('form-btn--warning')).toBe(false);
  });
});
