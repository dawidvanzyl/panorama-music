import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasRole } from '../../../../services/token-storage';
import type { BankingDetails, TeacherResult } from '../../services/teachers';

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasRole: vi.fn() };
});

import '../pm-banking-section';
import type { PmBankingSection } from '../pm-banking-section';

const banking: BankingDetails = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumberLast4: '7890',
};

const schoolPaidTeacher: TeacherResult = {
  teacherId: 't1',
  firstName: 'Thandi',
  surname: 'Mokoena',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
  banking: null,
};

const privateTeacher: TeacherResult = { ...schoolPaidTeacher, teacherId: 't2', isPrivate: true };

function mount(teacher: TeacherResult): PmBankingSection {
  const el = document.createElement('pm-banking-section') as PmBankingSection;
  document.body.appendChild(el);
  el.teacher = teacher;
  return el;
}

function textOf(el: PmBankingSection): string {
  return el.shadowRoot!.textContent ?? '';
}

function byId(el: PmBankingSection, id: string): HTMLElement {
  return el.shadowRoot!.getElementById(id) as HTMLElement;
}

let element: PmBankingSection | null = null;

beforeEach(() => {
  vi.mocked(hasRole).mockReset().mockReturnValue(true);
});

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('pm-banking-section — the section is present for every teacher', { tags: ['233UC12'] }, () => {
  it('renders an empty state and an add action for a school-paid teacher with no details', () => {
    element = mount(schoolPaidTeacher);

    expect(byId(element, 'emptyView').hidden).toBe(false);
    expect(byId(element, 'readView').hidden).toBe(true);
    expect(byId(element, 'addBtn').hidden).toBe(false);
    expect(textOf(element)).toContain('No banking details captured.');
  });

  it('renders the same empty state for a private teacher — classification does not gate it', () => {
    element = mount(privateTeacher);

    expect(byId(element, 'emptyView').hidden).toBe(false);
    expect(textOf(element)).toContain('No banking details captured.');
  });
});

describe('pm-banking-section — the account number is masked', { tags: ['233UC13'] }, () => {
  it('shows only the last four digits and no full number anywhere in the markup', () => {
    element = mount({ ...privateTeacher, banking });

    expect(byId(element, 'accountNumberValue').textContent).toBe('•••• •••• 7890');
    expect(element.shadowRoot!.innerHTML).not.toContain('1234567890');
    expect(textOf(element)).toContain('Encrypted at rest');
  });
});

describe('pm-banking-section — reveal asks the server for the full value', { tags: ['233UC14'] }, () => {
  it('requests a reveal on click and displays the number the page hands back', () => {
    element = mount({ ...privateTeacher, banking });

    const requested = vi.fn();
    element.addEventListener('teacher-banking-reveal-requested', requested);
    (byId(element, 'revealBtn') as HTMLButtonElement).click();

    // The component never fetches the number itself — the page owns the call,
    // so what is asserted here is that it is asked for and then displayed.
    expect(requested).toHaveBeenCalledTimes(1);

    element.showRevealed('1234567890');

    expect(byId(element, 'accountNumberValue').textContent).toBe('1234567890');
    expect(byId(element, 'revealLabel').textContent).toBe('Hide');
    expect(byId(element, 'revealIcon').textContent).toBe('visibility_off');
  });

  it('hides the number again on its own after fifteen seconds', () => {
    vi.useFakeTimers();
    try {
      element = mount({ ...privateTeacher, banking });
      element.showRevealed('1234567890');

      vi.advanceTimersByTime(14_999);
      expect(byId(element, 'accountNumberValue').textContent).toBe('1234567890');

      vi.advanceTimersByTime(1);

      // An unattended screen is the exposure masking exists to prevent, so the
      // reveal expires without anyone having to hide it.
      expect(byId(element, 'accountNumberValue').textContent).toBe('•••• •••• 7890');
      expect(byId(element, 'revealLabel').textContent).toBe('Reveal');
      expect(byId(element, 'revealIcon').textContent).toBe('visibility');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not let a stale timer clear a number revealed after it', () => {
    vi.useFakeTimers();
    try {
      element = mount({ ...privateTeacher, banking });
      element.showRevealed('1234567890');

      vi.advanceTimersByTime(14_000);
      // A second reveal restarts the clock rather than inheriting the first's.
      element.showRevealed('1234567890');
      vi.advanceTimersByTime(2_000);

      expect(byId(element, 'accountNumberValue').textContent).toBe('1234567890');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('pm-banking-section — the section is present for every teacher', { tags: ['233UC12'] }, () => {
  it('offers no add action for a deactivated teacher', () => {
    element = mount({ ...privateTeacher, isActive: false });

    // The empty state still renders — the section is never hidden — but
    // capturing details for a deactivated teacher is not on offer.
    expect(byId(element, 'emptyView').hidden).toBe(false);
    expect(byId(element, 'addBtn').hidden).toBe(true);
  });

  it('keeps an open form and a revealed number when the same teacher is reassigned', () => {
    element = mount({ ...privateTeacher, banking });
    element.showRevealed('1234567890');
    (byId(element, 'editBtn') as HTMLButtonElement).click();

    // The page reassigns the teacher after any edit to the record — a
    // classification toggle here — which must not discard banking form input.
    element.teacher = { ...privateTeacher, banking, isPrivate: false };

    expect(byId(element, 'formView').hidden).toBe(false);

    // Deleting the details, though, does drop the revealed number.
    element.teacher = { ...privateTeacher, banking: null };

    expect(byId(element, 'emptyView').hidden).toBe(false);
    expect(element.shadowRoot!.innerHTML).not.toContain('1234567890');
  });
});

describe(
  'pm-banking-section — a deactivated teacher has no details and no way to add any',
  { tags: ['234UC12'] },
  () => {
    it('shows the empty state with no add action once deactivation has deleted the details', () => {
      element = mount({ ...privateTeacher, banking });

      // The state the record is in immediately after deactivation: the details
      // are gone and the teacher is inactive.
      element.teacher = { ...privateTeacher, isActive: false, banking: null };

      expect(byId(element, 'emptyView').hidden).toBe(false);
      expect(byId(element, 'readView').hidden).toBe(true);
      expect(textOf(element)).toContain('No banking details captured.');
      // None may be captured while a teacher is inactive, so the add action is
      // not offered at all.
      expect(byId(element, 'addBtn').hidden).toBe(true);
    });
  },
);

describe('pm-banking-section — a Coordinator gets a masked, read-only view', { tags: ['233UC15'] }, () => {
  it('offers no edit, delete or reveal action and explains the restriction', () => {
    vi.mocked(hasRole).mockReturnValue(false);
    element = mount({ ...privateTeacher, banking });

    expect(byId(element, 'readActions').hidden).toBe(true);
    expect(byId(element, 'revealBtn').hidden).toBe(true);
    expect(byId(element, 'revealNote').textContent).toBe(
      'Your role can see the masked value only. Revealing the full number is restricted to a BankingCoordinator or the linked teacher.',
    );
    expect(byId(element, 'accountNumberValue').textContent).toBe('•••• •••• 7890');
  });
});
