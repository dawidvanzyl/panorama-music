import { afterEach, describe, expect, it } from 'vitest';
import '../../features/teachers/components/pm-teacher-delete-modal';
import '../../features/teachers/components/pm-banking-delete-modal';
import '../../features/teachers/components/pm-teacher-deactivate-modal';
import '../../features/teachers/components/pm-unlink-account-modal';
import '../../features/students/components/pm-delete-student-modal';
import '../../features/students/components/pm-delete-relationship-modal';
import '../../features/students/components/pm-delete-guardian-modal';
import '../../features/students/components/pm-delete-waiting-list-entry-modal';
import '../../features/students/components/pm-withdraw-enrollment-modal';
import '../../features/courses/components/pm-delete-course-modal';
import '../../features/admin/components/pm-delete-user-modal';
import '../../features/admin/components/pm-deactivate-user-modal';
import '../../features/extra-curriculars/components/pm-delete-extra-curricular-modal';
import '../../features/reports/components/pm-delete-report-modal';
import '../../features/sessions/components/pm-revoke-all-sessions-modal';

interface ConfirmationModal extends HTMLElement {
  setBusy(busy: boolean): void;
  showError(message: string): void;
  close(): void;
}

interface Case {
  tag: string;
  label: string;
  confirmId: string;
  event: string;
  show: (modal: ConfirmationModal) => void;
  typed?: string;
  variant?: 'primary';
}

const cases: Case[] = [
  {
    tag: 'pm-teacher-delete-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'teacher-delete-confirmed',
    show: (m) => (m as unknown as { show(n: string): void }).show('Thandi Mokoena'),
  },
  {
    tag: 'pm-banking-delete-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'teacher-banking-delete-confirmed',
    show: (m) => (m as unknown as { show(n: string): void }).show('1234'),
  },
  {
    tag: 'pm-teacher-deactivate-modal',
    label: 'Deactivate',
    confirmId: 'deactivateBtn',
    event: 'teacher-deactivate-confirmed',
    show: (m) => (m as unknown as { show(n: string): void }).show('Thandi Mokoena'),
  },
  {
    tag: 'pm-unlink-account-modal',
    label: 'Unlink',
    confirmId: 'unlinkBtn',
    event: 'teacher-account-unlink-confirmed',
    show: (m) => (m as unknown as { show(n: string): void }).show('teacher@test.com'),
    variant: 'primary',
  },
  {
    tag: 'pm-delete-student-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'student-delete-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('s1', 'Ayesha Khan'),
  },
  {
    tag: 'pm-delete-relationship-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'relationship-delete-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('r1', 'Mother'),
  },
  {
    tag: 'pm-delete-guardian-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'guardian-delete-confirmed',
    show: (m) =>
      (m as unknown as { show(a: string, b: string, c: string, d: boolean): void }).show('s1', 'g1', 'Sipho', false),
  },
  {
    tag: 'pm-delete-waiting-list-entry-modal',
    label: 'Remove',
    confirmId: 'deleteBtn',
    event: 'waiting-list-student-remove-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('s1', 'Ayesha Khan'),
  },
  {
    tag: 'pm-withdraw-enrollment-modal',
    label: 'Withdraw',
    confirmId: 'withdrawBtn',
    event: 'enrollment-withdraw-confirmed',
    show: (m) =>
      (m as unknown as { show(a: string, b: string, c: string, d: string): void }).show('s1', 'sc1', 'Ayesha', 'Piano'),
  },
  {
    tag: 'pm-delete-course-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'course-delete-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('c1', 'Grade 1 Enrichment'),
  },
  {
    tag: 'pm-delete-extra-curricular-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'extra-curricular-delete-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string, c: number): void }).show('e1', 'Choir', 2),
  },
  {
    tag: 'pm-deactivate-user-modal',
    label: 'Deactivate',
    confirmId: 'deactivateBtn',
    event: 'user-deactivate-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('u1', 'user@test.com'),
    variant: 'primary',
  },
  {
    tag: 'pm-delete-user-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'user-delete-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('u1', 'user@test.com'),
    typed: 'user@test.com',
  },
  {
    tag: 'pm-delete-report-modal',
    label: 'Delete',
    confirmId: 'deleteBtn',
    event: 'delete-report-confirmed',
    show: (m) => (m as unknown as { show(a: string, b: string): void }).show('rep1', 'Term report'),
  },
  {
    tag: 'pm-revoke-all-sessions-modal',
    label: 'Revoke All',
    confirmId: 'revokeAllBtn',
    event: 'revoke-all-sessions-confirmed',
    show: (m) => (m as unknown as { show(): void }).show(),
    typed: 'REVOKE ALL',
  },
];

const mounted: HTMLElement[] = [];

function open(testCase: Case): { modal: ConfirmationModal; confirm: HTMLButtonElement; cancel: HTMLButtonElement } {
  const modal = document.createElement(testCase.tag) as ConfirmationModal;
  document.body.appendChild(modal);
  mounted.push(modal);
  testCase.show(modal);
  const root = modal.shadowRoot!;
  return {
    modal,
    confirm: root.getElementById(testCase.confirmId) as HTMLButtonElement,
    cancel: root.getElementById('cancelBtn') as HTMLButtonElement,
  };
}

function type(modal: HTMLElement, text: string): void {
  const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input'));
}

function labelOf(button: HTMLButtonElement): string {
  return Array.from(button.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join('')
    .trim();
}

function enterLoading(testCase: Case): ReturnType<typeof open> & { events: Event[] } {
  const opened = open(testCase);
  const events: Event[] = [];
  opened.modal.addEventListener(testCase.event, (event) => events.push(event));
  if (testCase.typed) type(opened.modal, testCase.typed);
  opened.confirm.click();
  return { ...opened, events };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

describe('confirmation modals enter the loading state on confirm', { tags: ['377UC1'] }, () => {
  it.each(cases)('$tag disables the confirm action, shows the loading icon and disables Cancel', (testCase) => {
    const { modal, confirm, cancel, events } = enterLoading(testCase);

    expect(events).toHaveLength(1);
    expect(modal.hasAttribute('open')).toBe(true);
    expect(confirm.disabled).toBe(true);
    expect(confirm.getAttribute('aria-busy')).toBe('true');
    expect(labelOf(confirm)).toBe(testCase.label);
    const icon = confirm.firstElementChild as HTMLElement;
    expect(icon.dataset.testid).toBe('button-loading-icon');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(confirm.querySelectorAll('[data-testid="button-loading-icon"]')).toHaveLength(1);
    expect(cancel.disabled).toBe(true);
  });

  it('pm-revoke-all-sessions-modal ignores a backdrop click and an Escape key press while busy', () => {
    const testCase = cases.find((c) => c.tag === 'pm-revoke-all-sessions-modal')!;
    const { modal } = enterLoading(testCase);

    const backdrop = modal.shadowRoot!.querySelector('.modal__backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(modal.hasAttribute('open')).toBe(true);
  });
});

describe('confirmation modals are restored by the parent on failure', { tags: ['377UC2'] }, () => {
  it.each(cases)('$tag shows the message and enables both actions again', (testCase) => {
    const { modal, confirm, cancel } = enterLoading(testCase);

    modal.setBusy(false);
    modal.showError('The server refused this.');

    expect(modal.hasAttribute('open')).toBe(true);
    expect(confirm.disabled).toBe(false);
    expect(cancel.disabled).toBe(false);
    expect(confirm.hasAttribute('aria-busy')).toBe(false);
    expect(confirm.querySelector('[data-testid="button-loading-icon"]')).toBeNull();
    expect(labelOf(confirm)).toBe(testCase.label);
    expect(modal.shadowRoot!.getElementById('error')!.textContent).toBe('The server refused this.');
  });

  it.each(cases)('$tag clears an earlier error and the busy state when shown again', (testCase) => {
    const { modal, confirm } = enterLoading(testCase);
    modal.showError('Earlier failure');
    modal.close();

    testCase.show(modal);

    expect(modal.shadowRoot!.getElementById('error')!.textContent).toBe('');
    expect(confirm.hasAttribute('aria-busy')).toBe(false);
    expect(confirm.querySelector('[data-testid="button-loading-icon"]')).toBeNull();
  });
});

describe('typed-confirmation modals keep the typed-text gate while busy', { tags: ['377UC3'] }, () => {
  const typedCases = cases.filter((c) => c.typed);

  it.each(typedCases)('$tag keeps the confirm action disabled until the text matches', (testCase) => {
    const { modal, confirm } = open(testCase);

    expect(confirm.disabled).toBe(true);
    type(modal, 'something else');
    expect(confirm.disabled).toBe(true);
    type(modal, testCase.typed!);
    expect(confirm.disabled).toBe(false);
  });

  it.each(typedCases)('$tag stays disabled when the text is typed again during the request', (testCase) => {
    const { modal, confirm, cancel } = enterLoading(testCase);

    expect(confirm.disabled).toBe(true);
    expect(cancel.disabled).toBe(true);

    type(modal, testCase.typed!);

    expect(confirm.disabled).toBe(true);
    expect(confirm.getAttribute('aria-busy')).toBe('true');
  });

  it.each(typedCases)(
    '$tag enables the confirm action after the request only if the text still matches',
    (testCase) => {
      const { modal, confirm } = enterLoading(testCase);

      modal.setBusy(false);
      expect(confirm.disabled).toBe(false);

      modal.setBusy(true);
      type(modal, 'edited during the request');
      modal.setBusy(false);
      expect(confirm.disabled).toBe(true);
    },
  );
});

describe('confirmation modal action rows', { tags: ['377UC4'] }, () => {
  it.each(cases)('$tag holds Cancel then the confirm action of its family', (testCase) => {
    const { modal, confirm, cancel } = open(testCase);
    const variant = testCase.variant ?? 'destructive';
    const other = variant === 'primary' ? 'destructive' : 'primary';

    const row = modal.shadowRoot!.querySelector('[data-testid="modal-actions"]')!;
    expect(Array.from(row.children)).toEqual([cancel, confirm]);
    expect(cancel.classList.contains('modal__btn--cancel')).toBe(true);
    expect(confirm.classList.contains(`modal__btn--${variant}`)).toBe(true);
    expect(confirm.classList.contains(`modal__btn--${other}`)).toBe(false);
    expect(row.lastElementChild).toBe(confirm);
  });
});

describe('confirmation modals keep their Cancel and confirm look', { tags: ['387UC4'] }, () => {
  it.each(cases)('$tag has no warning variant on Cancel or the confirm action', (testCase) => {
    const { confirm, cancel } = open(testCase);

    for (const button of [cancel, confirm]) {
      expect(Array.from(button.classList).some((name) => name.endsWith('--warning'))).toBe(false);
    }
    expect(confirm.classList.contains(`modal__btn--${testCase.variant ?? 'destructive'}`)).toBe(true);
  });
});
