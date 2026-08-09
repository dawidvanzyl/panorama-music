import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { TeacherResult } from '../../services/teachers';

const mockIsAuthenticated = vi.fn(() => true);
vi.mock('../../../../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  handleUnauthorized: vi.fn(),
  logout: vi.fn(),
}));

const mockHasRole = vi.fn();
const mockHasAnyRole = vi.fn();
vi.mock('../../../../services/token-storage', () => ({
  hasRole: (role: string) => mockHasRole(role),
  hasAnyRole: (roles: string[]) => mockHasAnyRole(roles),
  getAccessToken: () => 'token',
  getEmail: () => 'david.okafor@panoramamusic.school',
}));

const mockGetOwnTeacher = vi.fn();
vi.mock('../../services/teachers', async () => {
  const actual = await vi.importActual<typeof import('../../services/teachers')>('../../services/teachers');
  return { ...actual, getOwnTeacher: () => mockGetOwnTeacher() };
});

import '../../../../components/pm-nav-bar';
import '../pm-my-details-menu';

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

/** Grants exactly the given roles to both role checks. */
function grantRoles(...roles: string[]): void {
  mockHasRole.mockImplementation((role: string) => roles.includes(role));
  mockHasAnyRole.mockImplementation((asked: string[]) => asked.some((role) => roles.includes(role)));
}

let navBar: HTMLElement | null = null;

/** The shell's composition: the feature's menu slotted into the shared nav bar. */
async function mountShell(): Promise<HTMLElement> {
  navBar = document.createElement('pm-nav-bar');
  const menu = document.createElement('pm-my-details-menu');
  menu.setAttribute('slot', 'account-menu');
  navBar.appendChild(menu);
  document.body.appendChild(navBar);
  // The menu asks the server whether there is a record to offer before it
  // decides to show itself; let that settle before asserting.
  await new Promise((resolve) => setTimeout(resolve, 0));

  return menu;
}

beforeEach(() => {
  mockIsAuthenticated.mockReturnValue(true);
  mockGetOwnTeacher.mockReset().mockResolvedValue(linkedTeacher);
  grantRoles('Teacher');
});

afterEach(() => {
  if (navBar) document.body.removeChild(navBar);
  navBar = null;
  document.querySelectorAll('.pm-my-details-dialogs').forEach((el) => el.remove());
});

describe('account chip — My Details is offered only to a linked teacher', { tags: ['235UC9'] }, () => {
  it('offers My Details in the account menu when the account is linked to a teacher', async () => {
    const menu = await mountShell();

    const chip = navBar!.shadowRoot!.getElementById('accountChip') as HTMLButtonElement;
    const accountMenu = navBar!.shadowRoot!.getElementById('accountMenu') as HTMLElement;
    const chevron = navBar!.shadowRoot!.getElementById('accountChevron') as HTMLElement;

    expect(menu.hidden).toBe(false);
    expect(chevron.hidden).toBe(false);
    expect(accountMenu.hidden).toBe(true);

    chip.click();

    expect(accountMenu.hidden).toBe(false);
    expect(menu.shadowRoot!.getElementById('openBtn')!.textContent).toContain('My Details');
  });

  it('offers nothing when the signed-in account is linked to no teacher', async () => {
    mockGetOwnTeacher.mockRejectedValue(new Error('not found'));

    const menu = await mountShell();
    await vi.waitFor(() => expect(menu.hidden).toBe(true));

    const chip = navBar!.shadowRoot!.getElementById('accountChip') as HTMLButtonElement;
    const accountMenu = navBar!.shadowRoot!.getElementById('accountMenu') as HTMLElement;

    chip.click();

    expect((navBar!.shadowRoot!.getElementById('accountChevron') as HTMLElement).hidden).toBe(true);
    expect(accountMenu.hidden).toBe(true);
  });

  it('does not ask for a record for an account that cannot hold one', async () => {
    grantRoles('Coordinator');

    const menu = await mountShell();

    expect(mockGetOwnTeacher).not.toHaveBeenCalled();
    expect(menu.hidden).toBe(true);
  });
});
