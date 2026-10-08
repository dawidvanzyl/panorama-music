import type { Page } from '@playwright/test';
import { expect } from './base';
import { loginAsRoles } from './testUsers';
import { seedEnrollmentTarget, seedPrivateActivityOnlyStudent, waitForSeededEntry, type SeededEnrollmentTarget } from './enrollment';
import type { UserRole } from '../pages/identity/admin/AdminUsersPage';
import {
  instrumentCourseId,
  seedListedActivity,
  seedNamedTeacher,
  seedStudent,
  textsOf,
} from './studentPrint';
import type { StudentsPage } from '../pages/students/StudentsPage';

export const INSTRUMENT_COURSE_LABEL = 'Instrument · Individual · Half Hour · During School';

export interface SeededTeacher {
  teacherId: string;
  teacherName: string;
}

/** Signs in holding Teacher and Coordinator (plus any extra roles) and seeds the Recorder course, waiting until it is listed. */
export async function signInWithRecorder(
  page: Page,
  extraRoles: UserRole[] = [],
): Promise<SeededEnrollmentTarget> {
  await loginAsRoles(page, ['Teacher', 'Coordinator', ...extraRoles]);
  const target = await seedEnrollmentTarget(page);
  await waitForSeededEntry(page, '/api/courses', 'courseId', target.courseId);
  return target;
}

/** The Piano Instrument course, waited for until listed. */
export async function listedInstrumentCourse(page: Page): Promise<string> {
  const courseId = await instrumentCourseId(page);
  await waitForSeededEntry(page, '/api/courses', 'courseId', courseId);
  return courseId;
}

/** Creates a teacher and waits until the teacher roster lists them. */
export async function seedListedTeacher(page: Page, firstName: string, surname: string): Promise<SeededTeacher> {
  const teacher = await seedNamedTeacher(page, firstName, surname);
  await waitForSeededEntry(page, '/api/teachers/roster', 'teacherId', teacher.teacherId);
  return teacher;
}

export interface WorkedExample {
  token: string;
  anna: SeededTeacher;
  ravi: SeededTeacher;
  lerato: SeededTeacher;
  thandi: string;
  pieter: string;
  aisha: string;
  sipho: string;
  emma: string;
  noCourse: string;
  all: string[];
}

/** Seeds the three teachers and six students every filter scenario narrows. */
export async function seedWorkedExample(
  page: Page,
  target: SeededEnrollmentTarget,
  token: string,
): Promise<WorkedExample> {
  const anna = await seedListedTeacher(page, 'Anna', `Venter${token}`);
  const ravi = await seedListedTeacher(page, 'Ravi', `Naidoo${token}`);
  const lerato = await seedListedTeacher(page, 'Lerato', `Smit${token}`);
  const piano = await listedInstrumentCourse(page);

  const recorder = (teacher: SeededTeacher) => ({ courseId: target.courseId, teacherId: teacher.teacherId });
  const instrument = (teacher: SeededTeacher) => ({
    courseId: piano,
    teacherId: teacher.teacherId,
    instrumentType: 'Piano',
    stepType: 'Step3A',
  });

  await seedStudent(page, target, {
    firstName: 'Thandi', lastName: token, grade: 'Grade5', class: 'E2', phase: 'Junior',
    enrolments: [recorder(anna), instrument(ravi)],
  });
  await seedStudent(page, target, {
    firstName: 'Pieter', lastName: token, grade: 'Grade3', class: 'A1', phase: 'Junior',
    enrolments: [recorder(anna)],
  });
  await seedStudent(page, target, {
    firstName: 'Aisha', lastName: token, grade: 'Grade7', class: 'A2', phase: 'Senior',
    enrolments: [recorder(ravi)],
  });
  await seedStudent(page, target, {
    firstName: 'Sipho', lastName: token, grade: 'Grade5', class: 'E3', phase: 'Junior',
    enrolments: [recorder(lerato), instrument(anna)],
  });
  await seedStudent(page, target, {
    firstName: 'Emma', lastName: token, grade: 'Grade2', class: 'E1', phase: 'Junior',
    enrolments: [recorder(ravi)],
  });

  const choirId = await seedListedActivity(page, {
    description: `Choir ${token}`,
    phase: 'Junior',
    practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
  });
  await seedPrivateActivityOnlyStudent(page, [choirId], token);

  const named = (first: string) => `${first} ${token}`;
  const names = {
    thandi: named('Thandi'),
    pieter: named('Pieter'),
    aisha: named('Aisha'),
    sipho: named('Sipho'),
    emma: named('Emma'),
    noCourse: named('Amara'),
  };
  return {
    token,
    anna,
    ravi,
    lerato,
    ...names,
    all: [names.thandi, names.pieter, names.aisha, names.sipho, names.emma, names.noCourse],
  };
}

/** Waits until the listed students are exactly these names, in any order. */
export async function expectRoster(studentsPage: StudentsPage, names: string[]): Promise<void> {
  await expect
    .poll(async () => (await textsOf(studentsPage.listedStudentNames())).map((text) => text.trim()).sort())
    .toEqual([...names].sort());
  await expect(studentsPage.emptyRosterMessage()).toBeHidden();
}

/** Waits until no student is listed and the roster states exactly that. */
export async function expectNoStudents(studentsPage: StudentsPage): Promise<void> {
  await expect(studentsPage.listedStudentNames()).toHaveCount(0);
  await expect(studentsPage.emptyRosterMessage()).toBeVisible();
  await expect(studentsPage.emptyRosterMessage()).toHaveText('No students found.');
}

/** Waits until a student whose listed name is exactly `name` is on the roster. */
export async function expectListed(studentsPage: StudentsPage, name: string): Promise<void> {
  await expect
    .poll(async () => (await textsOf(studentsPage.listedStudentNames())).map((text) => text.trim()))
    .toContain(name);
}

/** The Teacher filter reads exactly this, and the other four controls read their defaults. */
export async function expectTeacherFilterReads(studentsPage: StudentsPage, text: string): Promise<void> {
  expect(await studentsPage.selectedOptionText(studentsPage.filterTeacherSelect)).toBe(text);
}
