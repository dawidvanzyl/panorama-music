import { isAuthenticated } from './auth';
import { hasAnyRole } from './token-storage';

export interface NavEntry {
  /** Element id of the rendered sidebar link. */
  id: string;
  /** Route the entry navigates to, without the leading `#`. */
  path: string;
  icon: string;
  label: string;
  roles: string[];
  /**
   * Entries owning a nested area (e.g. a detail screen beneath the list) stay
   * marked active for any route below their own path.
   */
  matchesNested?: boolean;
  /**
   * Opens a new group: a rule is drawn above this entry, but only when there
   * is something offered on both sides of it to separate.
   */
  startsGroup?: boolean;
}

/**
 * The sidebar is the only navigation tier, so this order is what "topmost
 * entry" means — both for what the sidebar renders and for where `/` sends a
 * user. Hiding an entry is presentation only; the route guards in `main.ts`
 * and the endpoint policies remain the enforcement point.
 *
 * An entry's `roles` must therefore stay no looser than the guard covering the
 * same path. An entry offered to a role its guard refuses would send that role
 * from `/` to a screen the guard bounces back to `/`, looping.
 */
export const NAV_ENTRIES: NavEntry[] = [
  {
    id: 'userManagementLink',
    path: '/admin/users',
    icon: 'group',
    label: 'Users',
    roles: ['Admin'],
  },
  {
    id: 'adminSessionsLink',
    path: '/admin/sessions',
    icon: 'history',
    label: 'User Sessions',
    roles: ['Admin'],
  },
  {
    id: 'activityLogLink',
    path: '/admin/activity-log',
    icon: 'receipt_long',
    label: 'Activity Log',
    roles: ['Admin'],
  },
  {
    id: 'studentManagementLink',
    path: '/students',
    icon: 'group',
    label: 'Students',
    // Students are a Teacher-owned area; Admin owns nothing in it.
    roles: ['Teacher'],
    startsGroup: true,
  },
  {
    id: 'teachersLink',
    path: '/teachers',
    icon: 'school',
    label: 'Teachers',
    roles: ['Coordinator', 'BankingCoordinator'],
    matchesNested: true,
  },
  {
    id: 'courseManagementLink',
    path: '/courses',
    icon: 'library_music',
    label: 'Courses',
    // Courses are owned by Teacher and Coordinator; Admin owns nothing in it.
    roles: ['Teacher', 'Coordinator'],
  },
  {
    id: 'extraCurricularsLink',
    path: '/extra-curriculars',
    icon: 'sports_soccer',
    label: 'Extra-Curriculars',
    // Extra-curriculars are a Coordinator-owned area, and the Admin role owns
    // nothing in it; a person who happens to be an admin reaches the page
    // through their Teacher role.
    roles: ['Teacher', 'Coordinator'],
  },
  {
    id: 'guardianRelationshipsLink',
    path: '/students/guardian-relationships',
    icon: 'family_restroom',
    label: 'Guardian Relationships',
    // Guardian Relationships are Coordinator-owned; Admin owns nothing in it.
    roles: ['Coordinator'],
  },
];

export function isNavEntryPermitted(entry: NavEntry): boolean {
  return isAuthenticated() && hasAnyRole(entry.roles);
}

export function isNavEntryActive(entry: NavEntry, basePath: string): boolean {
  return entry.matchesNested
    ? basePath === entry.path || basePath.startsWith(entry.path + '/')
    : basePath === entry.path;
}

/**
 * The route `/` renders nothing of its own; it resolves to the first entry the
 * signed-in user's roles permit, so different role sets land on different
 * screens. Returns null when no entry is permitted at all.
 */
export function resolveLandingPath(): string | null {
  return NAV_ENTRIES.find(isNavEntryPermitted)?.path ?? null;
}
