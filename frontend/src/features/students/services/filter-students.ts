import type { Grade, Phase, RosterStudentResult, StudentClass } from './students';

export interface StudentFilters {
  name?: string;
  grade?: Grade;
  class?: StudentClass;
  phase?: Phase;
  teacherId?: string;
}

/** Applies name/grade/phase/class/teacher filters to a cached roster — a
 * client-side concern, not a server round trip. */
export function filterStudents(students: RosterStudentResult[], filters: StudentFilters): RosterStudentResult[] {
  const name = filters.name?.trim().toLowerCase();

  return students.filter((student) => {
    if (filters.grade && student.grade !== filters.grade) return false;
    if (filters.class && student.class !== filters.class) return false;
    if (filters.phase && student.phase !== filters.phase) return false;
    if (filters.teacherId && !student.teacherIds.includes(filters.teacherId)) return false;
    if (name && !`${student.firstName} ${student.lastName}`.toLowerCase().includes(name)) return false;
    return true;
  });
}
