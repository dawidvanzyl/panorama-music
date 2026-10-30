import { afterEach, describe, expect, it } from 'vitest';
import '../../features/reports/components/pm-save-report-modal';
import '../../features/teachers/components/pm-link-account-modal';
import '../../features/teachers/components/pm-my-details-modal';
import '../../features/teachers/components/pm-banking-activity-modal';
import '../../features/students/components/pm-enrol-waiting-list-student-modal';

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

function mount(tag: string, ...args: unknown[]): ShadowRoot {
  const modal = document.createElement(tag);
  document.body.appendChild(modal);
  (modal as unknown as { show: (...a: unknown[]) => void }).show(...args);
  return modal.shadowRoot!;
}

function title(root: ShadowRoot): HTMLElement {
  return root.getElementById('modalTitle')!;
}

function button(root: ShadowRoot, id: string): HTMLElement {
  return root.getElementById(id)!;
}

function expectNoHeaderIcon(root: ShadowRoot): void {
  expect(root.querySelector('.modal__header .modal__icon')).toBeNull();
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pm-save-report-modal — wording', { tags: ['394UC1'] }, () => {
  it('shows no header icon, the Save Report title and the Save Report confirm label', () => {
    const root = mount('pm-save-report-modal', '');

    expectNoHeaderIcon(root);
    expect(title(root).textContent).toBe('Save Report');
    expect(button(root, 'saveBtn').textContent).toBe('Save Report');
  });
});

describe('pm-link-account-modal — wording', { tags: ['394UC2'] }, () => {
  it('shows no header icon, the Link Account title and the Link Account confirm label', () => {
    const root = mount('pm-link-account-modal', []);

    expectNoHeaderIcon(root);
    expect(title(root).textContent).toBe('Link Account');
    expect(button(root, 'linkBtn').textContent).toBe('Link Account');
  });
});

describe('pm-enrol-waiting-list-student-modal — wording', { tags: ['394UC3'] }, () => {
  it('shows no header icon, the shared modal title and the Enrol Student confirm label', () => {
    const root = mount('pm-enrol-waiting-list-student-modal', waitingListEntry, 'DuringSchool');

    expectNoHeaderIcon(root);
    expect(title(root).tagName).toBe('H2');
    expect(title(root).classList.contains('modal__title')).toBe(true);
    expect(title(root).classList.contains('enrol__title')).toBe(false);
    expect(title(root).textContent).toBe('Enrol Student');
    expect(button(root, 'confirmBtn').textContent).toBe('Enrol Student');
  });
});

describe('information modals — wording', { tags: ['394UC4'] }, () => {
  it('shows My Details with no header icon', () => {
    const root = mount('pm-my-details-modal', teacher);

    expectNoHeaderIcon(root);
    expect(title(root).textContent).toBe('My Details');
  });

  it('shows Banking Activity with no header icon', () => {
    const root = mount('pm-banking-activity-modal', []);

    expectNoHeaderIcon(root);
    expect(title(root).textContent).toBe('Banking Activity');
  });
});
