import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTeacherById,
  updateTeacherProfile,
  updateTeacherClassification,
  getLinkableAccounts,
  unlinkTeacherAccount,
  linkTeacherAccount,
  TeachersError,
  type TeacherResult,
} from '../../services/teachers';

vi.mock('../../services/teachers', async () => {
  const actual = await vi.importActual<typeof import('../../services/teachers')>('../../services/teachers');
  return {
    ...actual,
    getTeacherById: vi.fn(),
    updateTeacherProfile: vi.fn(),
    updateTeacherClassification: vi.fn(),
    getLinkableAccounts: vi.fn(),
    unlinkTeacherAccount: vi.fn(),
    linkTeacherAccount: vi.fn(),
  };
});

import '../pm-teacher-detail-page';
import type { PmTeacherProfileSection } from '../../components/pm-teacher-profile-section';

const alice: TeacherResult = {
  teacherId: 't1',
  firstName: 'Alice',
  surname: 'Vance',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-teacher-detail-page');
  el.setAttribute('teacher-id', alice.teacherId);
  document.body.appendChild(el);
  await flush();
  return el;
}

function sectionOf(el: HTMLElement): PmTeacherProfileSection {
  return el.shadowRoot!.getElementById('profileSection') as unknown as PmTeacherProfileSection;
}

function toggleOf(el: HTMLElement): HTMLInputElement {
  return sectionOf(el).shadowRoot!.getElementById('private') as HTMLInputElement;
}

beforeEach(() => {
  vi.mocked(getTeacherById).mockReset().mockResolvedValue(alice);
  vi.mocked(updateTeacherProfile).mockReset();
  vi.mocked(updateTeacherClassification).mockReset();
  vi.mocked(getLinkableAccounts)
    .mockReset()
    .mockResolvedValue([{ accountId: 'acc-1', email: 'ada@test.com' }]);
  vi.mocked(unlinkTeacherAccount).mockReset();
  vi.mocked(linkTeacherAccount).mockReset();
});

const linkedAlice: TeacherResult = { ...alice, linkedAccountId: 'acc-9', linkedAccountEmail: 'linked@test.com' };

describe('pm-teacher-detail-page — a linked account is shown, not re-pickable', { tags: ['232UC10'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('names the account, offers no picker, and offers an unlink action', async () => {
    vi.mocked(getTeacherById).mockResolvedValue(linkedAlice);

    el = await mountPage();
    const headerShadow = el.shadowRoot!.getElementById('header')!.shadowRoot!;

    expect(headerShadow.getElementById('accountBadge')!.shadowRoot!.textContent).toContain('linked@test.com');
    expect(headerShadow.getElementById('unlinkBtn')!.hasAttribute('hidden')).toBe(false);
    expect(headerShadow.getElementById('linkBtn')!.hasAttribute('hidden')).toBe(true);
    expect(el.shadowRoot!.getElementById('linkNotice')!.hasAttribute('hidden')).toBe(false);
    // The record itself never carries a dropdown — the picker lives in the modal.
    expect(el.shadowRoot!.querySelector('select')).toBeNull();
    expect(el.shadowRoot!.getElementById('linkModal')!.hasAttribute('open')).toBe(false);
    expect(vi.mocked(getLinkableAccounts)).not.toHaveBeenCalled();
  });

  it('unlinking is confirmed in a modal, then clears the account and offers Link account', async () => {
    vi.mocked(getTeacherById).mockResolvedValue(linkedAlice);
    vi.mocked(unlinkTeacherAccount).mockResolvedValue(alice);

    el = await mountPage();
    const headerShadow = el.shadowRoot!.getElementById('header')!.shadowRoot!;
    const unlinkModal = el.shadowRoot!.getElementById('unlinkModal')!;

    headerShadow.getElementById('unlinkBtn')!.click();
    expect(unlinkModal.hasAttribute('open')).toBe(true);
    expect(unlinkModal.shadowRoot!.getElementById('modalEmail')!.textContent).toBe('linked@test.com');
    expect(vi.mocked(unlinkTeacherAccount)).not.toHaveBeenCalled();

    unlinkModal.shadowRoot!.getElementById('unlinkBtn')!.click();
    await flush();

    expect(vi.mocked(unlinkTeacherAccount)).toHaveBeenCalledWith('t1');
    expect(headerShadow.getElementById('accountBadge')!.shadowRoot!.textContent).toContain('No login account');
    expect(headerShadow.getElementById('unlinkBtn')!.hasAttribute('hidden')).toBe(true);
    expect(headerShadow.getElementById('linkBtn')!.hasAttribute('hidden')).toBe(false);
    expect(el.shadowRoot!.getElementById('linkNotice')!.hasAttribute('hidden')).toBe(true);
  });

  it('Link account opens the modal with the eligible accounts and links the chosen one', async () => {
    vi.mocked(getTeacherById).mockResolvedValue(alice);
    vi.mocked(linkTeacherAccount).mockResolvedValue(linkedAlice);

    el = await mountPage();
    const headerShadow = el.shadowRoot!.getElementById('header')!.shadowRoot!;
    const linkModal = el.shadowRoot!.getElementById('linkModal')!;

    headerShadow.getElementById('linkBtn')!.click();
    await flush();

    expect(linkModal.hasAttribute('open')).toBe(true);
    const select = linkModal.shadowRoot!.getElementById('picker')!.shadowRoot!.querySelector('select')!;
    expect([...select.options].map((o) => o.value)).toEqual(['', 'acc-1']);

    select.value = 'acc-1';
    linkModal.shadowRoot!.getElementById('linkBtn')!.click();
    await flush();

    expect(vi.mocked(linkTeacherAccount)).toHaveBeenCalledWith('t1', 'acc-1');
    expect(linkModal.hasAttribute('open')).toBe(false);
    expect(headerShadow.getElementById('accountBadge')!.shadowRoot!.textContent).toContain('linked@test.com');
  });
});

describe('pm-teacher-detail-page — profile edit covers names only', { tags: ['231UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('saves only first name and surname through the profile endpoint', async () => {
    el = await mountPage();
    vi.mocked(updateTeacherProfile).mockResolvedValue({ ...alice, firstName: 'Alicia' });

    const section = sectionOf(el);
    (section.shadowRoot!.getElementById('editBtn') as HTMLButtonElement).click();

    const form = section.shadowRoot!.getElementById('editForm') as HTMLElement;
    (form.shadowRoot!.getElementById('firstName') as HTMLInputElement).value = 'Alicia';
    (form.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(vi.mocked(updateTeacherProfile)).toHaveBeenCalledWith('t1', {
      firstName: 'Alicia',
      surname: 'Vance',
    });
    expect(form.hidden).toBe(true);
  });
});

describe('pm-teacher-detail-page — classification persists immediately', { tags: ['231UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('saves the flag on change without entering edit mode', async () => {
    el = await mountPage();
    vi.mocked(updateTeacherClassification).mockResolvedValue({ ...alice, isPrivate: true });

    const toggle = toggleOf(el);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await flush();

    expect(vi.mocked(updateTeacherClassification)).toHaveBeenCalledWith('t1', true);
    expect(sectionOf(el).teacher!.isPrivate).toBe(true);
  });

  it('reverts the switch and surfaces the error when the immediate save fails', async () => {
    el = await mountPage();
    vi.mocked(updateTeacherClassification).mockRejectedValue(new TeachersError('Save failed', 500));

    const toggle = toggleOf(el);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await flush();

    expect(toggle.checked).toBe(false);
    expect(sectionOf(el).shadowRoot!.getElementById('classificationError')!.textContent).toBe('Save failed');
  });
});
