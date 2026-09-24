import type { Page } from '@playwright/test';
import { expect } from './base';
import type { SeededEnrollmentTarget } from './enrollment';

export interface SeedReportStudentOptions {
  firstName: string;
  lastName: string;
  /** Defaults to `Grade4`. `Private` carries no class or phase, per the domain rule. */
  grade?: string;
  class?: string;
  phase?: string;
  language?: string;
  /** ISO `yyyy-MM-dd`. Defaults to `2014-05-12`. */
  dateOfBirth?: string;
}

/**
 * Creates a student already enrolled in the seeded course, with the attributes
 * a report scenario needs to filter or project on — `seedEnrolledStudent`
 * takes none of these. Makes the same two calls (create, enrol) as that
 * fixture, through `page.evaluate` so the requests carry the signed-in
 * caller's bearer token.
 */
export async function seedReportStudent(
  page: Page,
  target: SeededEnrollmentTarget,
  options: SeedReportStudentOptions
): Promise<string> {
  const grade = options.grade ?? 'Grade4';
  const isPrivate = grade === 'Private';

  const seeded = await page.evaluate(
    async ({ options, grade, isPrivate, courseId, teacherId }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };

      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: options.firstName,
          lastName: options.lastName,
          dateOfBirth: options.dateOfBirth ?? '2014-05-12',
          grade,
          class: isPrivate ? null : (options.class ?? 'A1'),
          phase: isPrivate ? null : (options.phase ?? 'Junior'),
          language: options.language ?? 'English',
        }),
      });
      const student = (await studentResponse.json()) as { studentId: string };

      const enrollResponse = await fetch(`/api/students/${student.studentId}/courses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId,
          teacherId,
          instrumentType: null,
          stepType: null,
          enrolledDate: new Date().toISOString().slice(0, 10),
        }),
      });

      return {
        studentStatus: studentResponse.status,
        enrollStatus: enrollResponse.status,
        studentId: student.studentId,
      };
    },
    { options, grade, isPrivate, courseId: target.courseId, teacherId: target.teacherId }
  );

  expect(seeded.studentStatus).toBe(201);
  expect(seeded.enrollStatus).toBe(201);

  return seeded.studentId;
}

export interface ReportFieldOptionApi {
  value: string;
  label: string;
}

export interface ReportFilterFieldApi {
  key: string;
  collection: string;
  label: string;
  dataType: string;
  operators: string[];
  options: ReportFieldOptionApi[];
}

export interface ReportColumnFieldApi {
  key: string;
  collection: string;
  header: string;
  displayOrder: number;
  dependsOn: string | null;
  locked: boolean;
}

export interface ReportFieldsApiResult {
  status: number;
  body: {
    filters?: ReportFilterFieldApi[];
    columns?: ReportColumnFieldApi[];
    error?: string;
  };
}

/** `GET /api/reports/fields`, from the signed-in session, carrying its own status and body. */
export async function fetchReportFields(page: Page): Promise<ReportFieldsApiResult> {
  return page.evaluate(async () => {
    const response = await fetch('/api/reports/fields', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  }) as Promise<ReportFieldsApiResult>;
}

export interface RunReportFilterInput {
  field: string;
  operator: string;
  values: string[];
}

export interface RunReportBody {
  filters: RunReportFilterInput[];
  columns: string[];
}

export interface RunReportApiResult {
  status: number;
  body: {
    ranAt?: string;
    studentCount?: number;
    columns?: { key: string; header: string }[];
    sections?: { studentId: string; rows: string[][] }[];
    error?: string;
  };
}

/**
 * `POST /api/reports/run`, from the signed-in session — for the requests the
 * builder's own controls cannot produce (an unregistered key, a value the
 * registry refuses, a role that has no path to the screen at all).
 */
export async function runReportViaApi(
  page: Page,
  body: RunReportBody
): Promise<RunReportApiResult> {
  return page.evaluate(async (body) => {
    const response = await fetch('/api/reports/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json().catch(() => ({}));
    return { status: response.status, body: responseBody };
  }, body) as Promise<RunReportApiResult>;
}
