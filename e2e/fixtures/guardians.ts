import type { Page } from '@playwright/test';
import { expect } from './base';

export interface GuardianSeedInput {
  firstName?: string;
  surname?: string;
  cell?: string | null;
  email?: string | null;
  receivesCorrespondence?: boolean;
  responsibleForPayment?: boolean;
  married?: boolean;
}

export interface SeededGuardian {
  guardianId: string;
  firstName: string;
  surname: string;
  fullName: string;
  cell: string | null;
  email: string | null;
}

export interface GuardianRead {
  guardianId: string;
  firstName: string;
  surname: string;
  cell: string | null;
  email: string | null;
  restricted: boolean;
}

/** The first seeded relationship type, for a caller that needs a real id and does not care which. */
export async function firstGuardianRelationshipId(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const response = await fetch('/api/guardian-relationships', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const relationships = (await response.json()) as { guardianRelationshipId: string }[];
    return relationships[0].guardianRelationshipId;
  });
}

/**
 * Adds a guardian to a student through the real endpoint, from the signed-in
 * session. Whether the guardian ends up private to this student or shared with
 * their siblings is decided by when this is called relative to the sibling
 * link — the handler links a new guardian to whichever siblings exist at the
 * moment it runs — so seeding order is what a caller controls, and no UI form
 * can express it as precisely.
 */
export async function addGuardianToStudent(
  page: Page,
  studentId: string,
  input: GuardianSeedInput = {}
): Promise<SeededGuardian> {
  const guardianRelationshipId = await firstGuardianRelationshipId(page);
  const firstName = input.firstName ?? 'Guardian';
  const surname = input.surname ?? `G-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const created = await page.evaluate(
    async ({ studentId, body }) => {
      const response = await fetch(`/api/students/${studentId}/guardians`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify(body),
      });
      const guardian = (await response.json()) as { guardianId: string };
      return { status: response.status, guardianId: guardian.guardianId };
    },
    {
      studentId,
      body: {
        guardianRelationshipId,
        firstName,
        surname,
        cell: input.cell ?? '0821234567',
        email: input.email ?? null,
        receivesCorrespondence: input.receivesCorrespondence ?? false,
        responsibleForPayment: input.responsibleForPayment ?? false,
        married: input.married ?? false,
      },
    }
  );

  expect(created.status).toBe(201);

  return {
    guardianId: created.guardianId,
    firstName,
    surname,
    fullName: `${firstName} ${surname}`,
    cell: input.cell ?? '0821234567',
    email: input.email ?? null,
  };
}

/**
 * Removes one student's association with a guardian, leaving every other
 * student's link intact. Used while seeding to reach a state the add path
 * cannot produce on its own: linking two students as siblings shares each
 * one's guardians with the other, so a guardian that belongs to only one of
 * two linked siblings is reached by adding it and then unlinking the other.
 */
export async function unlinkGuardianFromStudent(
  page: Page,
  studentId: string,
  guardianId: string
): Promise<void> {
  const status = await page.evaluate(
    async ({ studentId, guardianId }) => {
      const response = await fetch(`/api/students/${studentId}/guardians/${guardianId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
      });
      return response.status;
    },
    { studentId, guardianId }
  );

  expect(status).toBe(200);
}

/** The guardians linked to a student, as the API answers them for the signed-in caller. */
export async function fetchGuardians(page: Page, studentId: string): Promise<GuardianRead[]> {
  return page.evaluate(async (studentId) => {
    const response = await fetch(`/api/students/${studentId}/guardians`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return (await response.json()) as {
      guardianId: string;
      firstName: string;
      surname: string;
      cell: string | null;
      email: string | null;
      restricted: boolean;
    }[];
  }, studentId);
}

export interface GuardianUpdateAttempt {
  firstName: string;
  surname: string;
  cell: string | null;
  email: string | null;
}

/**
 * Submits an edit of a guardian straight to its own endpoint, bypassing the
 * screen entirely — for the boundary where the UI offers no edit control at
 * all, so the only way to ask whether the server itself refuses the write is
 * to make the request.
 */
export async function attemptUpdateGuardian(
  page: Page,
  guardianId: string,
  input: GuardianUpdateAttempt
): Promise<number> {
  const guardianRelationshipId = await firstGuardianRelationshipId(page);

  return page.evaluate(
    async ({ guardianId, body }) => {
      const response = await fetch(`/api/guardians/${guardianId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify(body),
      });
      return response.status;
    },
    {
      guardianId,
      body: {
        guardianRelationshipId,
        firstName: input.firstName,
        surname: input.surname,
        cell: input.cell,
        email: input.email,
        receivesCorrespondence: false,
        responsibleForPayment: false,
        married: false,
      },
    }
  );
}
