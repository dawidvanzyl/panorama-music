import type { TeacherResult } from './teachers';

export type TeacherStatusFilter = 'active' | 'deactivated';
export type TeacherAccountFilter = 'linked' | 'not-linked';
export type TeacherTypeFilter = 'private' | 'school-paid';

export interface TeacherFilters {
  name?: string;
  status?: TeacherStatusFilter;
  type?: TeacherTypeFilter;
  account?: TeacherAccountFilter;
}

/** Applies status/type/linked-account/name filters to a cached roster — a
 * client-side concern, not a server round trip. */
export function filterTeachers(teachers: TeacherResult[], filters: TeacherFilters): TeacherResult[] {
  const name = filters.name?.trim().toLowerCase();

  return teachers.filter((teacher) => {
    if (filters.status === 'active' && !teacher.isActive) return false;
    if (filters.status === 'deactivated' && teacher.isActive) return false;
    if (filters.type === 'private' && !teacher.isPrivate) return false;
    if (filters.type === 'school-paid' && teacher.isPrivate) return false;
    if (filters.account === 'linked' && !teacher.linkedAccountId) return false;
    if (filters.account === 'not-linked' && teacher.linkedAccountId) return false;
    if (name && !`${teacher.firstName} ${teacher.surname}`.toLowerCase().includes(name)) return false;
    return true;
  });
}
