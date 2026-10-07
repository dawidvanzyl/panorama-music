import type { StudentResult } from '../services/students';
import type { GuardianRelationship, GuardianResult } from '../services/guardians';
import type { EnrollmentResult } from '../services/enrollments';
import type { StudentExtraCurricular } from '../services/student-extra-curriculars';
import { gradeLabel, NO_SIBLINGS_LINKED, siblingLabel } from './student-options';
import { guardianFlags, guardianHeading } from './guardian-options';
import { enrolledLine, enrollmentAssignment, enrollmentHeading } from './enrollment-options';
import { NO_ACTIVITIES_ASSIGNED } from './extra-curricular-options';

export interface StudentRecordSource {
  student: StudentResult;
  siblings: StudentResult[];
  guardians: GuardianResult[];
  enrollments: EnrollmentResult[];
  extraCurriculars: StudentExtraCurricular[];
}

export interface RecordDetail {
  label: string;
  value: string;
}

export interface GuardianEntry {
  heading: string;
  cell: string | null;
  email: string | null;
  flags: string | null;
}

export interface CourseEntry {
  heading: string;
  assignment: string;
  enrolled: string;
}

// A4 is 210 mm wide; the 1 cm page margins leave 190 mm, which is 718 CSS px.
export const PRINTABLE_WIDTH_PX = 718;
export const COLUMN_GAP_PX = 24;
export const TWO_COLUMN_WIDTH_PX = (PRINTABLE_WIDTH_PX - COLUMN_GAP_PX) / 2;
export const FIT_ALLOWANCE_PX = 2;

export function printedOnLine(isoDate: string): string {
  return `Printed on ${isoDate}`;
}

export function recordDetails(student: StudentResult): RecordDetail[] {
  const details: (RecordDetail | null)[] = [
    { label: 'Grade', value: gradeLabel(student.grade) },
    student.phase ? { label: 'Phase', value: student.phase } : null,
    student.class ? { label: 'Class', value: student.class } : null,
    { label: 'Language', value: student.language },
    { label: 'Date of Birth', value: student.dateOfBirth },
  ];
  return details.filter((detail) => detail !== null);
}

export function siblingsLine(siblings: StudentResult[]): string {
  return siblings.length === 0 ? NO_SIBLINGS_LINKED : siblings.map(siblingLabel).join(', ');
}

export function guardianEntry(guardian: GuardianResult, relationships: GuardianRelationship[]): GuardianEntry {
  return {
    heading: guardianHeading(guardian, relationships),
    cell: guardian.cell || null,
    email: guardian.email || null,
    flags: guardianFlags(guardian),
  };
}

export function courseEntry(enrollment: EnrollmentResult): CourseEntry {
  return {
    heading: enrollmentHeading(enrollment),
    assignment: enrollmentAssignment(enrollment),
    enrolled: enrolledLine(enrollment),
  };
}

export function activitiesLine(extraCurriculars: StudentExtraCurricular[]): string {
  return extraCurriculars.length === 0
    ? NO_ACTIVITIES_ASSIGNED
    : extraCurriculars.map((activity) => activity.description).join(', ');
}

export function guardianColumnCount(emailWidths: number[]): 1 | 2 {
  return emailWidths.every((width) => width + FIT_ALLOWANCE_PX <= TWO_COLUMN_WIDTH_PX) ? 2 : 1;
}

export function contactFitsOneLine(lineWidth: number, columnWidth: number): boolean {
  return lineWidth + FIT_ALLOWANCE_PX <= columnWidth;
}
