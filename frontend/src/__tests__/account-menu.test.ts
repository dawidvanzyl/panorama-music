import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { TeacherResult } from '../features/teachers/services/teachers';

vi.mock('../services/auth', () => ({
  isAuthenticated: () => true,
  handleUnauthorized: vi.fn(),
  logout: vi.fn(),
}));

const mockHasRole = vi.fn();
const mockHasAnyRole = vi.fn();
vi.mock('../services/token-storage', () => ({
  hasRole: (role: string) => mockHasRole(role),
  hasAnyRole: (roles: string[]) => mockHasAnyRole(roles),
  getAccessToken: () => 'token',
  getEmail: () => 'david.okafor@panoramamusic.school',
}));

const mockGetOwnTeacher = vi.fn();
vi.mock('../features/teachers/services/teachers', async () => {
  const actual = await vi.importActual<typeof import('../features/teachers/services/teachers')>(
    '../features/teachers/services/teachers',
  );
  return { ...actual, getOwnTeacher: () => mockGetOwnTeacher() };
});

import '../components/pm-nav-bar';
import '../components/pm-logout-menu';
import '../features/teachers/components/pm-my-details-menu';
import '../features/sessions/components/pm-own-sessions-menu';

const linkedTeacher: TeacherResult = {
  teacherId: 't2',
  firstName: 'David',
  surname: 'Okafor',
  isPrivate: true,
  isActive: true,
  linkedAccountId: 'a2',
  linkedAccountEmail: 'david.okafor@panoramamusic.school',
  banking: null,
};

const entryTags = ['pm-my-details-menu', 'pm-own-sessions-menu', 'pm-logout-menu'] as const;

function grantRoles(...roles: string[]): void {
  mockHasRole.mockImplementation((role: string) => roles.includes(role));
  mockHasAnyRole.mockImplementation((asked: string[]) => asked.some((role) => roles.includes(role)));
}

let navBar: HTMLElement | null = null;

async function mountShell(): Promise<HTMLElement[]> {
  navBar = document.createElement('pm-nav-bar');
  const entries = entryTags.map((tag) => {
    const entry = document.createElement(tag);
    entry.setAttribute('slot', 'account-menu');
    navBar!.appendChild(entry);
    return entry;
  });
  document.body.appendChild(navBar);
  await new Promise((resolve) => setTimeout(resolve, 0));

  return entries;
}

function controlOf(entry: HTMLElement): HTMLElement {
  const control = entry.shadowRoot!.querySelector('button');
  if (!control) throw new Error('the entry renders no button');
  return control;
}

function accessibleText(control: HTMLElement): string {
  const clone = control.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());

  return (clone.textContent ?? '').trim();
}

beforeEach(() => {
  mockGetOwnTeacher.mockReset().mockResolvedValue(linkedTeacher);
});

afterEach(() => {
  if (navBar) document.body.removeChild(navBar);
  navBar = null;
});

describe('account dropdown — entries are plain buttons with no menu semantics', { tags: ['252UC1'] }, () => {
  it('declares no menu role or popup and exposes each entry on offer as a labelled button', async () => {
    grantRoles('Teacher');

    const entries = await mountShell();

    const chip = navBar!.shadowRoot!.getElementById('accountChip') as HTMLElement;
    const dropdown = navBar!.shadowRoot!.getElementById('accountMenu') as HTMLElement;
    expect(dropdown.hasAttribute('role')).toBe(false);
    expect(chip.hasAttribute('aria-haspopup')).toBe(false);

    const labels = ['My Details', 'Active Sessions', 'Logout'];
    entries.forEach((entry, index) => {
      const control = controlOf(entry);
      expect(entry.hasAttribute('hidden')).toBe(false);
      expect(control.tagName).toBe('BUTTON');
      expect(control.hasAttribute('role')).toBe(false);
      expect(accessibleText(control)).toBe(labels[index]);
    });
  });

  it('hides an entry the account cannot use so it is not announced, and leaves the others on offer', async () => {
    grantRoles('Coordinator');

    const [myDetails, ownSessions, logout] = await mountShell();

    const chip = navBar!.shadowRoot!.getElementById('accountChip') as HTMLElement;
    const dropdown = navBar!.shadowRoot!.getElementById('accountMenu') as HTMLElement;
    expect(dropdown.hasAttribute('role')).toBe(false);
    expect(chip.hasAttribute('aria-haspopup')).toBe(false);

    expect(myDetails.hasAttribute('hidden')).toBe(true);
    expect(ownSessions.hasAttribute('hidden')).toBe(false);
    expect(logout.hasAttribute('hidden')).toBe(false);
    expect(accessibleText(controlOf(ownSessions))).toBe('Active Sessions');
    expect(accessibleText(controlOf(logout))).toBe('Logout');
  });
});
