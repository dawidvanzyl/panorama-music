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
  { id: 'userManagementLink', path: '/admin/users', label: 'Users', roles: ['Admin'] },
  { id: 'adminSessionsLink', path: '/admin/sessions', label: 'User Sessions', roles: ['Admin'] },
  { id: 'activityLogLink', path: '/admin/activity-log', label: 'Activity Log', roles: ['Admin'] },
  { id: 'studentManagementLink', path: '/students', label: 'Students', roles: ['Teacher'] },
  { id: 'teachersLink', path: '/teachers', label: 'Teachers', roles: ['Coordinator', 'BankingCoordinator'] },
  { id: 'courseManagementLink', path: '/courses', label: 'Courses', roles: ['Teacher', 'Coordinator'] },
  // Admin owns none of the four entries above — each area belongs to Teacher,
  // Coordinator, or BankingCoordinator instead. Admin's own areas are the
  // three /admin/* entries at the top of this list.
  { id: 'extraCurricularsLink', path: '/extra-curriculars', label: 'Extra-Curriculars', roles: ['Teacher', 'Coordinator'] },
  {
    id: 'guardianRelationshipsLink',
    path: '/students/guardian-relationships',
    label: 'Guardian Relationships',
    roles: ['Coordinator'],
  },
];

export function permittedEntries(...roles: UserRole[]): SidebarEntry[] {
  return SIDEBAR_ENTRIES.filter((entry) => entry.roles.some((role) => roles.includes(role)));
}

/** Escapes all regex metacharacters so a literal path can be embedded in a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The URL a user holding these roles reaches after signing in. */
export function landingUrl(...roles: UserRole[]): RegExp {
  const landing = permittedEntries(...roles)[0];
  return new RegExp('#' + escapeRegExp(landing.path) + '$');
}

export function sidebarEntry(page: Page, id: string): Locator {
  return page.locator(`pm-sidebar #${id}`);
}
