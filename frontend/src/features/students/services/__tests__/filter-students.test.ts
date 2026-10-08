import { describe, it, expect } from 'vitest';
import { filterStudents } from '../filter-students';
import type { RosterStudentResult } from '../students';

const alice: RosterStudentResult = {
  studentId: 's1',
  firstName: 'Alice',
  lastName: 'Vance',
  dateOfBirth: '2014-05-12',
  grade: 'Grade4',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
  teacherIds: [],
};

const julian: RosterStudentResult = {
  studentId: 's2',
  firstName: 'Julian',
  lastName: 'Thorne',
  dateOfBirth: '2013-09-05',
  grade: 'Grade5',
  class: 'E1',
  phase: 'Senior',
  language: 'Afrikaans',
  teacherIds: [],
};

const zola: RosterStudentResult = {
  studentId: 's3',
  firstName: 'Zola',
  lastName: 'Ngwenya',
  dateOfBirth: '2012-01-20',
  grade: 'Private',
  class: null,
  phase: null,
  language: 'English',
  teacherIds: [],
};

const students = [alice, julian, zola];

describe('filterStudents', { tags: ['200UC5', '200UC9'] }, () => {
  it('returns every student when no filters are set', () => {
    expect(filterStudents(students, {})).toEqual(students);
  });

  it('filters by grade, returning only matching students', () => {
    expect(filterStudents(students, { grade: 'Grade5' })).toEqual([julian]);
  });

  it('filters by phase, returning only matching students', () => {
    expect(filterStudents(students, { phase: 'Junior' })).toEqual([alice]);
  });

  it('filters by class, returning only matching students', () => {
    expect(filterStudents(students, { class: 'E1' })).toEqual([julian]);
  });

  it('combines grade, phase, and class filters', () => {
    expect(filterStudents(students, { grade: 'Grade5', phase: 'Senior', class: 'E1' })).toEqual([julian]);
    expect(filterStudents(students, { grade: 'Grade5', phase: 'Junior', class: 'E1' })).toEqual([]);
  });

  it('filters by name, matching first or last name case-insensitively', () => {
    expect(filterStudents(students, { name: 'thorne' })).toEqual([julian]);
    expect(filterStudents(students, { name: 'ALICE' })).toEqual([alice]);
  });

  it('combines the name filter with grade/phase/class filters', () => {
    expect(filterStudents(students, { name: 'julian', grade: 'Grade4' })).toEqual([]);
    expect(filterStudents(students, { name: 'julian', grade: 'Grade5' })).toEqual([julian]);
  });

  it('excludes a Private-grade student (no class or phase) from any class or phase filter, but includes them otherwise', () => {
    expect(filterStudents(students, { class: 'A1' })).toEqual([alice]);
    expect(filterStudents(students, { phase: 'Senior' })).toEqual([julian]);
    expect(filterStudents(students, { grade: 'Private' })).toEqual([zola]);
    expect(filterStudents(students, {})).toContainEqual(zola);
  });
});

const anna = 'teacher-anna';
const ravi = 'teacher-ravi';
const lerato = 'teacher-lerato';

function rosterStudent(
  studentId: string,
  firstName: string,
  lastName: string,
  grade: RosterStudentResult['grade'],
  teacherIds: string[],
): RosterStudentResult {
  return {
    studentId,
    firstName,
    lastName,
    dateOfBirth: '2014-01-01',
    grade,
    class: grade === 'Private' ? null : 'A1',
    phase: grade === 'Private' ? null : 'Junior',
    language: 'English',
    teacherIds,
  };
}

const thandi = rosterStudent('w1', 'Thandi', 'Mokoena', 'Grade5', [anna, ravi]);
const pieter = rosterStudent('w2', 'Pieter', 'Botha', 'Grade3', [anna]);
const aisha = rosterStudent('w3', 'Aisha', 'Khumalo', 'Grade7', [ravi]);
const liam = rosterStudent('w4', 'Liam', 'van der Merwe', 'Private', []);
const sipho = rosterStudent('w5', 'Sipho', 'Dlamini', 'Grade5', [lerato, anna]);
const emma = rosterStudent('w6', 'Emma', 'Jacobs', 'Grade2', [ravi]);
const workedExample = [thandi, pieter, aisha, liam, sipho, emma];

describe('filterStudents by teacher', { tags: ['341UC4'] }, () => {
  it('lists only the students holding a course with the chosen teacher', () => {
    expect(filterStudents(workedExample, { teacherId: anna })).toEqual([thandi, pieter, sipho]);
  });
});

describe('filterStudents by teacher, student with no course', { tags: ['341UC5'] }, () => {
  it('excludes a student with no course under every teacher', () => {
    for (const teacherId of [anna, ravi, lerato]) {
      expect(filterStudents(workedExample, { teacherId })).not.toContain(liam);
    }
  });
});

describe('filterStudents with the teacher cleared', { tags: ['341UC6'] }, () => {
  it('lists every student, including the one with no course, when no teacher is chosen', () => {
    expect(filterStudents(workedExample, { teacherId: anna })).toHaveLength(3);
    expect(filterStudents(workedExample, { teacherId: undefined })).toEqual(workedExample);
  });
});

describe('filterStudents combining teacher with other filters', { tags: ['341UC7'] }, () => {
  it('keeps only the students matching both the teacher and the grade', () => {
    expect(filterStudents(workedExample, { teacherId: anna, grade: 'Grade5' })).toEqual([thandi, sipho]);
  });

  it('lists nobody when no student matches both', () => {
    expect(filterStudents(workedExample, { teacherId: lerato, grade: 'Grade2' })).toEqual([]);
  });

  it('applies the grade filter alone when no teacher is chosen', () => {
    expect(filterStudents(workedExample, { grade: 'Grade5' })).toEqual([thandi, sipho]);
  });
});

describe('filterStudents without a teacher', { tags: ['341UC8'] }, () => {
  const filterSets = [
    { name: 'vance' },
    { grade: 'Grade5' as const },
    { phase: 'Junior' as const },
    { class: 'E1' as const },
    { name: 'julian', grade: 'Grade5' as const, phase: 'Senior' as const, class: 'E1' as const },
    { grade: 'Private' as const },
  ];

  it.each(filterSets)('gives the same result with and without an unset teacher: %j', (filters) => {
    expect(filterStudents(students, { ...filters, teacherId: undefined })).toEqual(filterStudents(students, filters));
  });
});
