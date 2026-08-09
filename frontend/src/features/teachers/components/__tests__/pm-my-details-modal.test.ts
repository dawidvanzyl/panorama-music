import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasRole } from '../../../../services/token-storage';
import type { BankingDetails, TeacherResult } from '../../services/teachers';

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasRole: vi.fn() };
});

import '../pm-my-details-modal';
import type { PmMyDetailsModal } from '../pm-my-details-modal';

const banking: BankingDetails = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumberLast4: '5432',
};

const privateTeacher: TeacherResult = {
  teacherId: 't2',
  firstName: 'David',
  surname: 'Okafor',
  isPrivate: true,
  isActive: true,
  linkedAccountId: 'a2',
  linkedAccountEmail: 'david.okafor@panoramamusic.school',
  banking: null,
};

function mount(teacher: TeacherResult): PmMyDetailsModal {
  const el = document.createElement('pm-my-details-modal') as PmMyDetailsModal;
  document.body.appendChild(el);
  el.show(teacher);
  return el;
}

function textOf(el: PmMyDetailsModal): string {
  const bankingText = el.bankingSection.shadowRoot!.textContent ?? '';
  return `${el.shadowRoot!.textContent ?? ''}${bankingText}`;
}

let element: PmMyDetailsModal | null = null;

beforeEach(() => {
  // The teacher holds no Admin role — everything they are offered here comes
  // from owning the record, never from a role.
  vi.mocked(hasRole).mockReset().mockReturnValue(false);
});

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('pm-my-details-modal — the classification is shown, not offered', { tags: ['235UC10'] }, () => {
  it('renders the classification as a locked profile field carrying its value', () => {
    element = mount(privateTeacher);

    const lock = element.shadowRoot!.querySelector('.my-details__lock-icon')!;

    expect(lock.textContent).toBe('lock');
    expect(element.shadowRoot!.getElementById('classificationValue')!.textContent).toBe(
      'Private teacher - Paid directly by parents.',
    );
  });

  it('names a school-paid teacher as such', () => {
    element = mount({ ...privateTeacher, isPrivate: false });

    expect(element.shadowRoot!.getElementById('classificationValue')!.textContent).toBe(
      'School-paid - Paid by the school.',
    );
  });

  it('offers no control that could change it', () => {
    element = mount(privateTeacher);

    const classification = element.shadowRoot!.querySelector('.my-details__classification')!;

    expect(classification.querySelector('input')).toBeNull();
    expect(classification.querySelector('button')).toBeNull();
  });
});

describe('pm-my-details-modal — nothing the school decides is offered', { tags: ['235UC11'] }, () => {
  it('offers no account-link control and no deactivate, reactivate or delete action', () => {
    element = mount({ ...privateTeacher, banking });

    // Controls, not prose: the banking caption mentions deactivation, and what
    // has to be absent is the ability to act, not the word.
    const labels = [
      ...element.shadowRoot!.querySelectorAll('button'),
      ...element.bankingSection.shadowRoot!.querySelectorAll('button'),
    ].map((button) => (button.textContent ?? '').trim().toLowerCase());

    expect(labels).not.toContain('link account');
    expect(labels).not.toContain('unlink account');
    expect(labels).not.toContain('deactivate');
    expect(labels).not.toContain('reactivate');
    expect(labels).not.toContain('delete teacher');
    // The record's own delete lives on the teacher header, which this view has
    // none of — every button here belongs to the profile or the banking details.
    expect(element.shadowRoot!.querySelector('pm-teacher-header')).toBeNull();
    expect(element.shadowRoot!.querySelector('pm-account-link-picker')).toBeNull();
  });
});

describe('pm-my-details-modal — the teacher manages their own banking details', { tags: ['235UC12'] }, () => {
  it('offers edit, delete, reveal and activity with the account number masked', () => {
    element = mount({ ...privateTeacher, banking });

    const section = element.bankingSection;
    const byId = (id: string) => section.shadowRoot!.getElementById(id) as HTMLElement;

    expect(byId('readActions').hidden).toBe(false);
    expect(byId('editBtn').hidden).toBe(false);
    expect(byId('deleteBtn').hidden).toBe(false);
    expect(byId('revealBtn').hidden).toBe(false);
    expect(byId('activityBtn').hidden).toBe(false);
    expect(byId('accountNumberValue').textContent).toBe('•••• •••• 5432');
    expect(byId('caption').textContent).toContain('deleted if your record is deactivated');
    // Their own details, in a dialog that is already a card — no card around a
    // card, and no note explaining a restriction they are not under.
    expect(byId('card').classList.contains('banking__card--flush')).toBe(true);
    expect(byId('revealNote').hidden).toBe(true);
  });

  it('requests the full number rather than revealing one it already holds', () => {
    element = mount({ ...privateTeacher, banking });

    const requested = vi.fn();
    element.addEventListener('teacher-banking-reveal-requested', requested);
    (element.bankingSection.shadowRoot!.getElementById('revealBtn') as HTMLButtonElement).click();

    expect(requested).toHaveBeenCalledOnce();
    expect(textOf(element)).not.toContain('1009876');
  });
});
