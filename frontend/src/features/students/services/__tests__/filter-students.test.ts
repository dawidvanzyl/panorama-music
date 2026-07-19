import { describe, it, expect } from 'vitest';
import { filterStudents } from '../filter-students';
import type { StudentResult } from '../students';

const alice: StudentResult = {
  studentId: 's1',
  firstName: 'Alice',
  lastName: 'Vance',
  dateOfBirth: '2014-05-12',
  grade: 'Grade4',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
};

const julian: StudentResult = {
  studentId: 's2',
  firstName: 'Julian',
  lastName: 'Thorne',
  dateOfBirth: '2013-09-05',
  grade: 'Grade5',
  class: 'E1',
  phase: 'Senior',
  language: 'Afrikaans',
};

const students = [alice, julian];

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
});
