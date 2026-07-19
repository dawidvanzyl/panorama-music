import type { Grade, Phase, StudentClass, StudentResult } from './students';

export interface StudentFilters {
  name?: string;
  grade?: Grade;
  class?: StudentClass;
  phase?: Phase;
}

/** Applies grade/phase/class/name filters to a cached roster — a client-side
 * concern, not a server round trip. */
export function filterStudents(students: StudentResult[], filters: StudentFilters): StudentResult[] {
  const name = filters.name?.trim().toLowerCase();

  return students.filter((student) => {
    if (filters.grade && student.grade !== filters.grade) return false;
    if (filters.class && student.class !== filters.class) return false;
    if (filters.phase && student.phase !== filters.phase) return false;
    if (name && !`${student.firstName} ${student.lastName}`.toLowerCase().includes(name)) return false;
    return true;
  });
}
