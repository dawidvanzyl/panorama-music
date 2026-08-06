import { describe, it, expect } from 'vitest';
import { filterTeachers } from '../filter-teachers';
import type { TeacherResult } from '../teachers';

const alice: TeacherResult = {
  teacherId: 't1',
  firstName: 'Alice',
  surname: 'Vance',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
};

const julian: TeacherResult = {
  teacherId: 't2',
  firstName: 'Julian',
  surname: 'Thorne',
  isPrivate: true,
  isActive: true,
  linkedAccountId: 'acc-1',
};

const zola: TeacherResult = {
  teacherId: 't3',
  firstName: 'Zola',
  surname: 'Ngwenya',
  isPrivate: false,
  isActive: false,
  linkedAccountId: null,
};

const teachers = [alice, julian, zola];

describe('filterTeachers', { tags: ['231UC8'] }, () => {
  it('returns every teacher when no filters are set', () => {
    expect(filterTeachers(teachers, {})).toEqual(teachers);
  });

  it('filters by status, returning only matching teachers', () => {
    expect(filterTeachers(teachers, { status: 'active' })).toEqual([alice, julian]);
    expect(filterTeachers(teachers, { status: 'deactivated' })).toEqual([zola]);
  });

  it('filters by type, returning only private or only school-paid teachers', () => {
    expect(filterTeachers(teachers, { type: 'private' })).toEqual([julian]);
    expect(filterTeachers(teachers, { type: 'school-paid' })).toEqual([alice, zola]);
  });

  it('filters by linked-account status, returning only matching teachers', () => {
    expect(filterTeachers(teachers, { account: 'linked' })).toEqual([julian]);
    expect(filterTeachers(teachers, { account: 'not-linked' })).toEqual([alice, zola]);
  });

  it('filters by name, matching first name or surname case-insensitively', () => {
    expect(filterTeachers(teachers, { name: 'thorne' })).toEqual([julian]);
    expect(filterTeachers(teachers, { name: 'ALICE' })).toEqual([alice]);
  });

  it('combines multiple filters', () => {
    expect(filterTeachers(teachers, { status: 'active', type: 'private' })).toEqual([julian]);
    expect(filterTeachers(teachers, { status: 'active', type: 'school-paid' })).toEqual([alice]);
  });
});
