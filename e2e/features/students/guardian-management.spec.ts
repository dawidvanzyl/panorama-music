import { test, expect } from '../../fixtures/base';
import { goToStudentsPage } from '../../fixtures/testUsers';

function uniqueName(label: string): { firstName: string; lastName: string } {
  return {
    firstName: `E2E-${label}`,
    lastName: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

/** The relationship types seeded by seed_guardian_relationships.sql. */
const SEEDED_RELATIONSHIPS = [
  'Mother',
  'Father',
  'Stepmother',
  'Stepfather',
  'Grandmother',
  'Grandfather',
  'Legal Guardian',
  'Other',
];

test.describe('Guardian Profile Management', { tag: ['@6IT1', '@6IT4', '@6IT5'] }, () => {
  test('creates, reads, updates, and deletes a guardian profile', async ({ page }) => {
    const student = uniqueName('guardian-crud');
    const fullName = `${student.firstName} ${student.lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });

    await studentsPage.openGuardiansTab(fullName);

    // The relationship options come from the seeded lookup. Asserted as a
    // subset, not an exact list, so the companion relationship-maintenance
    // story adding a type does not break this.
    await studentsPage.openAddGuardianForm();
    for (const relationship of SEEDED_RELATIONSHIPS) {
      await expect(
        studentsPage.guardianRelationshipSelect().locator('option', { hasText: relationship }),
      ).not.toHaveCount(0);
    }
    await studentsPage.cancelGuardianForm();

    await studentsPage.addGuardian({
      firstName: 'Nomvula',
      surname: 'Dube',
      relationshipLabel: 'Mother',
      cell: '0821234567',
      email: 'nomvula.dube@example.com',
      receivesCorrespondence: true,
      responsibleForPayment: true,
      married: true,
    });

    const createdRow = studentsPage.guardianListRow('Nomvula Dube');
    await expect(createdRow).toBeVisible();
    await expect(createdRow).toContainText('Mother');
    await expect(createdRow).toContainText('0821234567');

    // Each of the three flags is captured independently.
    const createdFlags = studentsPage.guardianFlagCells('Nomvula Dube');
    await expect(createdFlags.receivesCorrespondence).toHaveText('Yes');
    await expect(createdFlags.responsibleForPayment).toHaveText('Yes');
    await expect(createdFlags.married).toHaveText('Yes');

    await studentsPage.editGuardian('Nomvula Dube', {
      surname: 'Khumalo',
      relationshipLabel: 'Father',
    });
    const updatedRow = studentsPage.guardianListRow('Nomvula Khumalo');
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText('Father');
    await expect(studentsPage.guardianListRow('Nomvula Dube')).toHaveCount(0);

    await studentsPage.deleteGuardian('Nomvula Khumalo');
    await expect(studentsPage.guardianListRow('Nomvula Khumalo')).toHaveCount(0);

    await studentsPage.closeWizard();
  });

  test("an expanded student row shows a read-only summary of that student's guardians", async ({
    page,
  }) => {
    const student = uniqueName('guardian-summary');
    const fullName = `${student.firstName} ${student.lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });

    await studentsPage.openGuardiansTab(fullName);
    await studentsPage.addGuardian({
      firstName: 'Thandi',
      surname: 'Nkosi',
      relationshipLabel: 'Mother',
      cell: '0829876543',
    });
    await studentsPage.closeWizard();

    await studentsPage.toggleRowExpanded(fullName);

    const summary = studentsPage.visibleGuardiansSummary();
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Thandi Nkosi');
    await expect(summary).toContainText('Mother');
  });
});

test.describe('Guardian Shared Across Multiple Students', { tag: ['@6IT2'] }, () => {
  test('a guardian added to one student is also linked to their linked sibling', async ({
    page,
  }) => {
    const studentA = uniqueName('guardian-shared-a');
    const studentB = uniqueName('guardian-shared-b');
    const fullNameA = `${studentA.firstName} ${studentA.lastName}`;
    const fullNameB = `${studentB.firstName} ${studentB.lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName: studentA.firstName,
      lastName: studentA.lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });
    await studentsPage.createStudent({
      firstName: studentB.firstName,
      lastName: studentB.lastName,
      dateOfBirth: '2013-09-05',
      grade: 'Grade5',
      class: 'E1',
      phase: 'Senior',
      language: 'Afrikaans',
    });

    await studentsPage.openSiblingsTab(fullNameA);
    await studentsPage.addSibling(fullNameB);
    await studentsPage.closeWizard();

    await studentsPage.openGuardiansTab(fullNameA);
    await studentsPage.addGuardian({
      firstName: 'Peter',
      surname: 'Ferreira',
      relationshipLabel: 'Father',
    });
    await expect(studentsPage.guardianListRow('Peter Ferreira')).toBeVisible();
    await studentsPage.closeWizard();

    await studentsPage.openGuardiansTab(fullNameB);
    await expect(studentsPage.guardianListRow('Peter Ferreira')).toBeVisible();
    await studentsPage.closeWizard();
  });

  test('a sibling that diverged by an unlink can re-link the missing guardian via Sync Guardians', async ({
    page,
  }) => {
    const studentA = uniqueName('guardian-sync-a');
    const studentB = uniqueName('guardian-sync-b');
    const fullNameA = `${studentA.firstName} ${studentA.lastName}`;
    const fullNameB = `${studentB.firstName} ${studentB.lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName: studentA.firstName,
      lastName: studentA.lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });
    await studentsPage.createStudent({
      firstName: studentB.firstName,
      lastName: studentB.lastName,
      dateOfBirth: '2013-09-05',
      grade: 'Grade5',
      class: 'E1',
      phase: 'Senior',
      language: 'Afrikaans',
    });

    await studentsPage.openSiblingsTab(fullNameA);
    await studentsPage.addSibling(fullNameB);
    await studentsPage.closeWizard();

    await studentsPage.openGuardiansTab(fullNameA);
    await studentsPage.addGuardian({
      firstName: 'Sipho',
      surname: 'Maluleke',
      relationshipLabel: 'Father',
    });
    await studentsPage.closeWizard();

    // Diverge: unlink from B only, leaving the record and A's link intact.
    await studentsPage.openGuardiansTab(fullNameB);
    await expect(studentsPage.guardianListRow('Sipho Maluleke')).toBeVisible();
    await studentsPage.deleteGuardian('Sipho Maluleke', 'one');
    await expect(studentsPage.guardianListRow('Sipho Maluleke')).toHaveCount(0);

    // B is now missing a guardian its sibling still holds, so Sync re-links it.
    await expect(studentsPage.syncGuardiansButton()).toBeVisible();
    await studentsPage.syncGuardians();
    await expect(studentsPage.guardianListRow('Sipho Maluleke')).toBeVisible();

    await studentsPage.closeWizard();

    // A kept its link throughout — the unlink was scoped to B.
    await studentsPage.openGuardiansTab(fullNameA);
    await expect(studentsPage.guardianListRow('Sipho Maluleke')).toBeVisible();
    await studentsPage.closeWizard();
  });
});

test.describe('Guardian Endpoint Authorization', { tag: ['@6IT6'] }, () => {
  test('rejects unauthenticated requests to the guardian endpoints', async ({ page }) => {
    // One per route group: the student-scoped guardians, the guardian record
    // itself, and the relationship lookup.
    const someGuid = '00000000-0000-0000-0000-000000000001';

    for (const path of [
      `/api/students/${someGuid}/guardians`,
      `/api/guardians/${someGuid}/shared`,
      '/api/guardian-relationships',
    ]) {
      const response = await page.request.get(path);

      expect(response.status(), `${path} should reject an unauthenticated request`).toBe(401);
    }
  });
});

test.describe('Student With Multiple Guardians', { tag: ['@6IT3'] }, () => {
  test('a student can have multiple linked guardians', async ({ page }) => {
    const student = uniqueName('guardian-multiple');
    const fullName = `${student.firstName} ${student.lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });

    await studentsPage.openGuardiansTab(fullName);
    await studentsPage.addGuardian({
      firstName: 'Nomvula',
      surname: 'Dube',
      relationshipLabel: 'Mother',
    });
    await studentsPage.addGuardian({
      firstName: 'Peter',
      surname: 'Dube',
      relationshipLabel: 'Father',
    });

    await expect(studentsPage.guardianListRow('Nomvula Dube')).toBeVisible();
    await expect(studentsPage.guardianListRow('Peter Dube')).toBeVisible();

    await studentsPage.closeWizard();
  });
});
