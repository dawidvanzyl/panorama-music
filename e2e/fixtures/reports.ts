import type { Page } from '@playwright/test';
import { expect } from './base';
import type { SeededEnrollmentTarget } from './enrollment';

export interface ReportStudentEnrolment {
  courseId: string;
  teacherId: string;
  instrumentType?: string | null;
  stepType?: string | null;
}

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
  /**
   * The exact courses to enrol the student in, instead of `target`. When
   * given, the student is enrolled in these and *not* in `target`, so a
   * scenario counting a student's course rows isn't thrown off by the
   * default `seedEnrollmentTarget` course.
   */
  enrolments?: ReportStudentEnrolment[];
}

/**
 * Creates a student already enrolled in the seeded course, with the attributes
 * a report scenario needs to filter or project on — `seedEnrolledStudent`
 * takes none of these. Makes the same two calls (create, enrol) as that
 * fixture, through `page.evaluate` so the requests carry the signed-in
 * caller's bearer token. When `options.enrolments` is given, the student is
 * enrolled in exactly those courses instead of `target`'s.
 */
export async function seedReportStudent(
  page: Page,
  target: SeededEnrollmentTarget,
  options: SeedReportStudentOptions
): Promise<string> {
  const grade = options.grade ?? 'Grade4';
  const isPrivate = grade === 'Private';
  const enrolments: ReportStudentEnrolment[] = options.enrolments ?? [
    { courseId: target.courseId, teacherId: target.teacherId },
  ];

  const seeded = await page.evaluate(
    async ({ options, grade, isPrivate, enrolments }) => {
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

      const enrollStatuses: number[] = [];
      for (const enrolment of enrolments) {
        const enrollResponse = await fetch(`/api/students/${student.studentId}/courses`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            courseId: enrolment.courseId,
            teacherId: enrolment.teacherId,
            instrumentType: enrolment.instrumentType ?? null,
            stepType: enrolment.stepType ?? null,
            enrolledDate: new Date().toISOString().slice(0, 10),
          }),
        });
        enrollStatuses.push(enrollResponse.status);
      }

      return {
        studentStatus: studentResponse.status,
        enrollStatuses,
        studentId: student.studentId,
      };
    },
    { options, grade, isPrivate, enrolments }
  );

  expect(seeded.studentStatus).toBe(201);
  for (const status of seeded.enrollStatuses) {
    expect(status).toBe(201);
  }

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

export interface SaveReportBody {
  name: string;
  definition: RunReportBody;
}

export interface SavedReportApiResult {
  status: number;
  body: {
    id?: string;
    error?: string;
  };
}

/** `POST /api/reports`, from the signed-in session. */
export async function saveReportViaApi(
  page: Page,
  body: SaveReportBody
): Promise<SavedReportApiResult> {
  return page.evaluate(async (body) => {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json().catch(() => ({}));
    return { status: response.status, body: responseBody };
  }, body) as Promise<SavedReportApiResult>;
}

export interface SavedReportSummaryApi {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  lastRunAt: string | null;
  isOwner: boolean;
}

export interface ListSavedReportsApiResult {
  status: number;
  body: SavedReportSummaryApi[] | { error?: string };
}

/** `GET /api/reports`, from the signed-in session. */
export async function listSavedReportsViaApi(page: Page): Promise<ListSavedReportsApiResult> {
  return page.evaluate(async () => {
    const response = await fetch('/api/reports', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  }) as Promise<ListSavedReportsApiResult>;
}

export interface SavedReportDetailApi {
  id: string;
  name: string;
  createdBy: string;
  lastRunAt: string | null;
  isOwner: boolean;
  definition?: {
    filters: { field: string; operator: string; values: string[] }[];
    columns: string[];
  };
  error?: string;
}

export interface GetSavedReportApiResult {
  status: number;
  body: SavedReportDetailApi;
}

/** `GET /api/reports/{id}`, from the signed-in session. */
export async function getSavedReportViaApi(
  page: Page,
  id: string
): Promise<GetSavedReportApiResult> {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/reports/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  }, id) as Promise<GetSavedReportApiResult>;
}

export interface RunSavedReportApiResult {
  status: number;
  body: {
    reportId?: string;
    name?: string;
    createdBy?: string;
    isOwner?: boolean;
    ranAt?: string;
    studentCount?: number;
    columns?: { key: string; header: string }[];
    sections?: { studentId: string; rows: string[][] }[];
    error?: string;
  };
}

/** `POST /api/reports/{id}/run`, from the signed-in session. */
export async function runSavedReportViaApi(
  page: Page,
  id: string
): Promise<RunSavedReportApiResult> {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/reports/${id}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  }, id) as Promise<RunSavedReportApiResult>;
}
