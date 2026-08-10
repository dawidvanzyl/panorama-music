import type { Locator, Page } from '@playwright/test';
import type { UserRole } from '../pages/identity/admin/AdminUsersPage';

export interface SidebarEntry {
  /** Element id of the sidebar link. */
  id: string;
  /** Route the entry navigates to, without the leading `#`. */
  path: string;
  label: string;
  roles: UserRole[];
}

/**
 * Mirrors the sidebar's own ordered entry list in
 * `frontend/src/services/nav-entries.ts`. The sidebar is the only navigation
 * tier, so this order is also what `/` resolves to: the topmost entry a user's
 * roles permit — which is what makes drift from the app's own list fail these
 * specs outright rather than pass them against stale expectations.
 */
export const SIDEBAR_ENTRIES: SidebarEntry[] = [
  { id: 'userManagementLink', path: '/admin/users', label: 'User Management', roles: ['Admin'] },
  { id: 'adminSessionsLink', path: '/admin/sessions', label: 'User Sessions', roles: ['Admin'] },
  { id: 'activityLogLink', path: '/admin/activity-log', label: 'Activity Log', roles: ['Admin'] },
  { id: 'studentManagementLink', path: '/students', label: 'Student Management', roles: ['Teacher', 'Admin'] },
  { id: 'teachersLink', path: '/teachers', label: 'Teacher Management', roles: ['Coordinator', 'Admin'] },
  {
    id: 'guardianRelationshipsLink',
    path: '/students/guardian-relationships',
    label: 'Guardian Relationships',
    roles: ['Coordinator', 'Admin'],
  },
];

export function permittedEntries(...roles: UserRole[]): SidebarEntry[] {
  return SIDEBAR_ENTRIES.filter((entry) => entry.roles.some((role) => roles.includes(role)));
}

/** The URL a user holding these roles reaches after signing in. */
export function landingUrl(...roles: UserRole[]): RegExp {
  const landing = permittedEntries(...roles)[0];
  return new RegExp('#' + landing.path.replace(/\//g, '\\/') + '$');
}

export function sidebarEntry(page: Page, id: string): Locator {
  return page.locator(`pm-sidebar #${id}`);
}
