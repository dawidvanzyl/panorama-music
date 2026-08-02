import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTeacherById,
  updateTeacherProfile,
  updateTeacherClassification,
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
