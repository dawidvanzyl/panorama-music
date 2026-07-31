import { test, expect } from '../../fixtures/base';
import {
  goToGuardianRelationshipsPage,
  goToStudentsPage,
  createRegisteredUser,
  uniqueTestEmail,
} from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { GuardianRelationshipsPage } from '../../pages/students/GuardianRelationshipsPage';

function uniqueRelationshipName(label: string): string {
  return `E2E-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function uniqueStudentName(label: string): { firstName: string; lastName: string } {
  return {
    firstName: `E2E-${label}`,
    lastName: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

test.describe('Guardian Relationship Management', { tag: ['@6IT8'] }, () => {
  test('creates, renames, and deletes a relationship type that is not in use', async ({ page }) => {
    const name = uniqueRelationshipName('relationship-crud');
    // Deliberately not a suffix of `name` — the row lookup matches on substring,
    // so the "old name is gone" assertion needs a genuinely distinct label.
    const renamed = uniqueRelationshipName('relationship-crud-renamed');
    const relationshipsPage = await goToGuardianRelationshipsPage(page);

    await relationshipsPage.createRelationship(name);
    await expect(relationshipsPage.row(name)).toBeVisible();

    await relationshipsPage.renameRelationship(name, renamed);
    await expect(relationshipsPage.row(renamed)).toBeVisible();
    await expect(relationshipsPage.row(name)).toHaveCount(0);

    // The maintained types feed the relationship dropdown on the guardian form.
    const student = uniqueStudentName('relationship-options');
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
    await studentsPage.openAddGuardianForm();
    const relationshipOptions = await studentsPage
      .guardianRelationshipSelect()
      .locator('option')
      .allTextContents();
    expect(relationshipOptions).toContain(renamed);
    await studentsPage.cancelGuardianForm();
    await studentsPage.closeWizard();

    await relationshipsPage.gotoGuardianRelationships();

    // Deleting is guarded by a confirmation modal — cancelling leaves it in place.
    await relationshipsPage.cancelDeleteRelationship(renamed);
    await expect(relationshipsPage.row(renamed)).toBeVisible();

    await relationshipsPage.deleteRelationship(renamed);
    await expect(relationshipsPage.row(renamed)).toHaveCount(0);
  });

  test('rejects deleting a relationship type that is still assigned to a guardian', async ({
    page,
  }) => {
    const name = uniqueRelationshipName('relationship-in-use');
    const relationshipsPage = await goToGuardianRelationshipsPage(page);

    await relationshipsPage.createRelationship(name);
    await expect(relationshipsPage.row(name)).toBeVisible();

    const student = uniqueStudentName('relationship-in-use');
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
      relationshipLabel: name,
    });
    await studentsPage.closeWizard();

    await relationshipsPage.gotoGuardianRelationships();
    await relationshipsPage.clickDeleteRelationship(name);

    // Refused up front: the confirmation is never offered for a type in use.
    await expect(relationshipsPage.errorBanner).toContainText('cannot be deleted');
    await expect(relationshipsPage.deleteModal).not.toHaveAttribute('open');
    await expect(relationshipsPage.row(name)).toBeVisible();

    // Renaming stays available while the type is in use.
    const renamed = `${name}-renamed`;
    await relationshipsPage.renameRelationship(name, renamed);
    await expect(relationshipsPage.row(renamed)).toBeVisible();
  });

  test('denies maintenance to a user who is neither Coordinator nor Admin', async ({ page }) => {
    const teacherEmail = uniqueTestEmail('relationship-teacher');
    const password = 'TeacherPass123!';
    await createRegisteredUser(page, teacherEmail, password, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(teacherEmail, password);
    await expect(page).toHaveURL(/#\/$/);

    // The route itself is closed to a Teacher, who is bounced back to the dashboard.
    const relationshipsPage = new GuardianRelationshipsPage(page);
    await relationshipsPage.gotoGuardianRelationships();
    await expect(page).toHaveURL(/#\/$/);

    // The endpoints themselves reject the Teacher too. Issued from inside the page
    // so the request carries the signed-in Teacher's bearer token — page.request
    // would send none and prove only that anonymous callers are rejected.
    const someGuid = '00000000-0000-0000-0000-000000000001';
    const statuses = await page.evaluate(async (guardianRelationshipId) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };
      const responses = await Promise.all([
        fetch('/api/guardian-relationships', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: 'Aunt' }),
        }),
        fetch(`/api/guardian-relationships/${guardianRelationshipId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ name: 'Aunt' }),
        }),
        fetch(`/api/guardian-relationships/${guardianRelationshipId}`, {
          method: 'DELETE',
          headers,
        }),
      ]);
      return responses.map((response) => response.status);
    }, someGuid);

    expect(statuses).toEqual([403, 403, 403]);

    // And an anonymous caller is rejected before authorization is even considered.
    const anonymousResponse = await page.request.post('/api/guardian-relationships', {
      data: { name: 'Aunt' },
    });
    expect(anonymousResponse.status()).toBe(401);
  });
});
