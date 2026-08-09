import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasRole } from '../../../../services/token-storage';
import type { TeacherResult } from '../../services/teachers';

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasRole: vi.fn() };
});

import '../pm-teacher-header';
import type { PmTeacherHeader } from '../pm-teacher-header';

const activeTeacher: TeacherResult = {
  teacherId: 't1',
  firstName: 'Thandi',
  surname: 'Mokoena',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
  banking: null,
};

const deactivatedTeacher: TeacherResult = { ...activeTeacher, isActive: false };

function mount(teacher: TeacherResult): PmTeacherHeader {
  const el = document.createElement('pm-teacher-header') as PmTeacherHeader;
  document.body.appendChild(el);
  el.teacher = teacher;
  return el;
}

function byId(el: PmTeacherHeader, id: string): HTMLElement {
  return el.shadowRoot!.getElementById(id) as HTMLElement;
}

let element: PmTeacherHeader | null = null;

beforeEach(() => {
  vi.mocked(hasRole).mockReset().mockReturnValue(true);
});

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('pm-teacher-header — an active teacher offers deactivate and no delete', { tags: ['234UC8'] }, () => {
  it('offers deactivate and withholds delete entirely', () => {
    element = mount(activeTeacher);

    expect(byId(element, 'deactivateBtn').hidden).toBe(false);
    // Absent rather than disabled: the action does not exist until the teacher
    // has been deactivated, so there is nothing to present as blocked.
    expect(byId(element, 'deleteBtn').hidden).toBe(true);
    expect(byId(element, 'reactivateBtn').hidden).toBe(true);
    expect(byId(element, 'statusChip').textContent).toBe('Active');
  });

  it('asks the page to deactivate rather than calling the API itself', () => {
    element = mount(activeTeacher);

    const requested = vi.fn();
    element.addEventListener('teacher-deactivate-requested', requested);
    (byId(element, 'deactivateBtn') as HTMLButtonElement).click();

    expect(requested).toHaveBeenCalledTimes(1);
  });
});

describe('pm-teacher-header — a Coordinator is offered no lifecycle action', { tags: ['234UC10'] }, () => {
  it('withholds deactivate, reactivate and delete for a non-Admin', () => {
    vi.mocked(hasRole).mockReturnValue(false);
    element = mount(activeTeacher);

    expect(byId(element, 'deactivateBtn').hidden).toBe(true);
    expect(byId(element, 'reactivateBtn').hidden).toBe(true);
    expect(byId(element, 'deleteBtn').hidden).toBe(true);
  });

  it('withholds them on a deactivated teacher too — state does not widen the role', () => {
    vi.mocked(hasRole).mockReturnValue(false);
    element = mount(deactivatedTeacher);

    expect(byId(element, 'reactivateBtn').hidden).toBe(true);
    expect(byId(element, 'deleteBtn').hidden).toBe(true);
  });
});

describe('pm-teacher-header — a deactivated teacher offers reactivate and delete', { tags: ['234UC11'] }, () => {
  it('shows the deactivated status and swaps deactivate for reactivate alongside delete', () => {
    element = mount(deactivatedTeacher);

    expect(byId(element, 'statusChip').textContent).toBe('Deactivated');
    expect(byId(element, 'reactivateBtn').hidden).toBe(false);
    expect(byId(element, 'deleteBtn').hidden).toBe(false);
    expect(byId(element, 'deactivateBtn').hidden).toBe(true);
  });

  it('asks the page to reactivate or delete rather than acting itself', () => {
    element = mount(deactivatedTeacher);

    const reactivateRequested = vi.fn();
    const deleteRequested = vi.fn();
    element.addEventListener('teacher-reactivate-requested', reactivateRequested);
    element.addEventListener('teacher-delete-requested', deleteRequested);

    (byId(element, 'reactivateBtn') as HTMLButtonElement).click();
    (byId(element, 'deleteBtn') as HTMLButtonElement).click();

    expect(reactivateRequested).toHaveBeenCalledTimes(1);
    expect(deleteRequested).toHaveBeenCalledTimes(1);
  });
});

describe('pm-teacher-header — a deactivated teacher cannot be given a login account', { tags: ['234UC14'] }, () => {
  it('disables the link action while the teacher is deactivated', () => {
    element = mount(activeTeacher);
    expect((byId(element, 'linkBtn') as HTMLButtonElement).disabled).toBe(false);

    // A link grants self-service access to the record and its banking details;
    // handing that to a teacher who has been stood down would reopen what
    // deactivation closed.
    element.teacher = deactivatedTeacher;
    expect((byId(element, 'linkBtn') as HTMLButtonElement).disabled).toBe(true);

    // And the bar lifts again on reactivation.
    element.teacher = activeTeacher;
    expect((byId(element, 'linkBtn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('still offers unlink for a deactivated teacher who has an account', () => {
    element = mount({ ...deactivatedTeacher, linkedAccountId: 'a1', linkedAccountEmail: 'teacher@example.com' });

    // Removing access from a stood-down teacher is never the wrong direction.
    expect(byId(element, 'unlinkBtn').hidden).toBe(false);
    expect(byId(element, 'linkBtn').hidden).toBe(true);
  });
});
