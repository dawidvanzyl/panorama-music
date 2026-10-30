import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../features/teachers/components/pm-teacher-delete-modal';
import '../../features/teachers/components/pm-banking-delete-modal';
import '../../features/teachers/components/pm-teacher-deactivate-modal';
import '../../features/teachers/components/pm-unlink-account-modal';
import '../../features/teachers/components/pm-link-account-modal';
import '../../features/teachers/components/pm-my-details-modal';
import '../../features/teachers/components/pm-banking-activity-modal';
import '../../features/students/components/pm-delete-student-modal';
import '../../features/students/components/pm-delete-relationship-modal';
import '../../features/students/components/pm-delete-guardian-modal';
import '../../features/students/components/pm-delete-waiting-list-entry-modal';
import '../../features/students/components/pm-withdraw-enrollment-modal';
import '../../features/students/components/pm-enrol-waiting-list-student-modal';
import '../../features/students/components/pm-student-wizard-modal';
import '../../features/courses/components/pm-delete-course-modal';
import '../../features/admin/components/pm-delete-user-modal';
import '../../features/admin/components/pm-deactivate-user-modal';
import '../../features/extra-curriculars/components/pm-delete-extra-curricular-modal';
import '../../features/reports/components/pm-delete-report-modal';
import '../../features/reports/components/pm-save-report-modal';
import '../../features/sessions/components/pm-revoke-all-sessions-modal';
import '../../features/sessions/components/pm-revoke-session-modal';
import '../../features/sessions/components/pm-revoke-other-sessions-modal';
import '../../features/extra-curriculars/components/pm-remove-practice-time-modal';
import '../../features/students/components/pm-unlink-activity-modal';
import '../../features/sessions/components/pm-own-sessions-modal';

type Opener = (modal: HTMLElement) => void;

interface FrameCase {
  tag: string;
  open: Opener;
  hasCancel: boolean;
  hasBusyState: boolean;
  role?: 'alertdialog';
}

function call(modal: HTMLElement, method: string, ...args: unknown[]): void {
  (modal as unknown as Record<string, (...a: unknown[]) => void>)[method](...args);
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

const waitingListEntry = {
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
};

const cases: FrameCase[] = [
  { tag: 'pm-teacher-delete-modal', open: (m) => call(m, 'show', 'Thandi'), hasCancel: true, hasBusyState: true },
  { tag: 'pm-banking-delete-modal', open: (m) => call(m, 'show', '1234'), hasCancel: true, hasBusyState: true },
  { tag: 'pm-delete-student-modal', open: (m) => call(m, 'show', 's1', 'Ayesha'), hasCancel: true, hasBusyState: true },
  {
    tag: 'pm-delete-relationship-modal',
    open: (m) => call(m, 'show', 'r1', 'Mother'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-delete-guardian-modal',
    open: (m) => call(m, 'show', 's1', 'g1', 'Sipho', false),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-delete-course-modal',
    open: (m) => call(m, 'show', 'c1', 'Grade 1 Enrichment'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-delete-user-modal',
    open: (m) => call(m, 'show', 'u1', 'user@test.com'),
    hasCancel: true,
    hasBusyState: true,
    role: 'alertdialog',
  },
  {
    tag: 'pm-delete-extra-curricular-modal',
    open: (m) => call(m, 'show', 'e1', 'Choir', 2),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-delete-waiting-list-entry-modal',
    open: (m) => call(m, 'show', 's1', 'Ayesha'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-withdraw-enrollment-modal',
    open: (m) => call(m, 'show', 's1', 'sc1', 'Ayesha', 'Piano'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-delete-report-modal',
    open: (m) => call(m, 'show', 'rep1', 'Term report'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-teacher-deactivate-modal',
    open: (m) => call(m, 'show', 'Thandi'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-unlink-account-modal',
    open: (m) => call(m, 'show', 'teacher@test.com'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-deactivate-user-modal',
    open: (m) => call(m, 'show', 'u1', 'user@test.com'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-revoke-all-sessions-modal',
    open: (m) => call(m, 'show'),
    hasCancel: true,
    hasBusyState: true,
    role: 'alertdialog',
  },
  {
    tag: 'pm-revoke-session-modal',
    open: (m) => call(m, 'show', 't1', 'Chrome on Windows'),
    hasCancel: true,
    hasBusyState: true,
  },
  { tag: 'pm-revoke-other-sessions-modal', open: (m) => call(m, 'show'), hasCancel: true, hasBusyState: true },
  {
    tag: 'pm-remove-practice-time-modal',
    open: (m) => call(m, 'show', 'ec1', 'pt1', 'Monday 08:00', 'Choir'),
    hasCancel: true,
    hasBusyState: true,
  },
  {
    tag: 'pm-unlink-activity-modal',
    open: (m) => call(m, 'show', 's1', 'ec1', 'Choir', 'Ayesha Khan'),
    hasCancel: true,
    hasBusyState: true,
  },
  { tag: 'pm-student-wizard-modal', open: (m) => call(m, 'openForCreate', []), hasCancel: true, hasBusyState: false },
  {
    tag: 'pm-enrol-waiting-list-student-modal',
    open: (m) => {
      call(m, 'show', waitingListEntry, 'DuringSchool');
    },
    hasCancel: true,
    hasBusyState: true,
  },
  { tag: 'pm-save-report-modal', open: (m) => call(m, 'show', ''), hasCancel: true, hasBusyState: true },
  { tag: 'pm-link-account-modal', open: (m) => call(m, 'show', []), hasCancel: true, hasBusyState: true },
  { tag: 'pm-my-details-modal', open: (m) => call(m, 'show', teacher), hasCancel: false, hasBusyState: false },
  { tag: 'pm-own-sessions-modal', open: (m) => call(m, 'show'), hasCancel: false, hasBusyState: false },
  { tag: 'pm-banking-activity-modal', open: (m) => call(m, 'show', []), hasCancel: false, hasBusyState: false },
];

const mounted: HTMLElement[] = [];

function openModal(testCase: FrameCase): { modal: HTMLElement; root: ShadowRoot; events: string[] } {
  const modal = document.createElement(testCase.tag);
  document.body.appendChild(modal);
  mounted.push(modal);
  testCase.open(modal);
  const events: string[] = [];
  const original = modal.dispatchEvent.bind(modal);
  vi.spyOn(modal, 'dispatchEvent').mockImplementation((event: Event) => {
    events.push(event.type);
    return original(event);
  });
  return { modal, root: modal.shadowRoot!, events };
}

function closeControl(root: ShadowRoot): HTMLButtonElement {
  return root.querySelector('.modal__header button[aria-label="Close"]') as HTMLButtonElement;
}

afterEach(() => {
  for (const modal of mounted.splice(0)) modal.remove();
  vi.restoreAllMocks();
});

describe('every modal header holds one close control after the title', { tags: ['390UC1'] }, () => {
  it.each(cases)('$tag', (testCase) => {
    const { root } = openModal(testCase);
    const header = root.querySelector('.modal__header')!;
    const controls = header.querySelectorAll('button[aria-label="Close"]');

    expect(controls).toHaveLength(1);
    expect(controls[0].textContent).toBe('close');
    expect(controls[0].classList.contains('modal__close')).toBe(true);
    const title = header.querySelector('h2')!;
    expect(title.compareDocumentPosition(controls[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('the close control does what Cancel does', { tags: ['390UC2'] }, () => {
  it.each(cases.filter((c) => c.hasCancel))('$tag', (testCase) => {
    const cancelled = openModal(testCase);
    (cancelled.root.getElementById('cancelBtn') as HTMLButtonElement).click();
    const cancelEvents = [...cancelled.events];
    const cancelOpen = cancelled.modal.hasAttribute('open');

    const closed = openModal(testCase);
    closeControl(closed.root).click();

    expect(closed.events).toEqual(cancelEvents);
    expect(closed.events).toEqual([]);
    expect(closed.modal.hasAttribute('open')).toBe(cancelOpen);
    expect(closed.modal.hasAttribute('open')).toBe(false);
  });

  it.each(cases.filter((c) => c.hasBusyState))(
    '$tag disables the close control exactly when Cancel is disabled',
    (testCase) => {
      const { modal, root } = openModal(testCase);
      const cancel = root.getElementById('cancelBtn') as HTMLButtonElement;

      call(modal, 'setBusy', true);
      expect(cancel.disabled).toBe(true);
      expect(closeControl(root).disabled).toBe(true);

      call(modal, 'setBusy', false);
      expect(cancel.disabled).toBe(false);
      expect(closeControl(root).disabled).toBe(false);
    },
  );
});

describe('the close control of a form or information modal closes it and emits nothing', { tags: ['390UC3'] }, () => {
  it.each(cases.filter((c) => !c.hasCancel))('$tag', (testCase) => {
    const { modal, root, events } = openModal(testCase);

    closeControl(root).click();

    expect(modal.hasAttribute('open')).toBe(false);
    expect(events).toEqual([]);
  });
});

describe('a backdrop click never closes a modal', { tags: ['390UC4'] }, () => {
  it.each(cases)('$tag', (testCase) => {
    const { modal, root, events } = openModal(testCase);

    root.querySelector('.modal__backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(modal.hasAttribute('open')).toBe(true);
    expect(events).toEqual([]);
  });
});

describe('every modal card is labelled as a dialog', { tags: ['390UC6'] }, () => {
  it.each(cases)('$tag', (testCase) => {
    const { root } = openModal(testCase);
    const card = root.querySelector('.modal__card')!;
    const labelId = card.getAttribute('aria-labelledby')!;

    expect(card.getAttribute('role')).toBe(testCase.role ?? 'dialog');
    expect(card.getAttribute('aria-modal')).toBe('true');
    expect(root.getElementById(labelId)!.tagName).toBe('H2');
  });
});
