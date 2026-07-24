import { test, expect } from '../../fixtures/base';
import { goToStudentsPage } from '../../fixtures/testUsers';

function uniqueName(label: string): { firstName: string; lastName: string } {
  return {
    firstName: `E2E-${label}`,
    lastName: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

test.describe('Student Profile Management', { tag: ['@5IT1', '@5IT3'] }, () => {
  test('creates, reads, updates, filters, and deletes a student profile', async ({ page }) => {
    const { firstName, lastName } = uniqueName('crud');
    const fullName = `${firstName} ${lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName,
      lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });

    await expect(studentsPage.row(fullName)).toBeVisible();
    await expect(studentsPage.row(fullName)).toContainText('Grade 4');

    await studentsPage.editStudent(fullName, { grade: 'Grade5', phase: 'Senior' });

    await expect(studentsPage.row(fullName)).toContainText('Grade 5');
    await expect(studentsPage.row(fullName)).toContainText('Senior');

    await studentsPage.filterByGrade('Grade5');
    await expect(studentsPage.row(fullName)).toBeVisible();

    await studentsPage.filterByGrade('Grade1');
    await expect(studentsPage.row(fullName)).toHaveCount(0);

    await studentsPage.clearFilters();
    await studentsPage.filterByName(firstName);
    await expect(studentsPage.row(fullName)).toBeVisible();

    await studentsPage.filterByName('NoSuchStudentName');
    await expect(studentsPage.row(fullName)).toHaveCount(0);

    await studentsPage.clearFilters();
    await expect(studentsPage.row(fullName)).toBeVisible();

    await studentsPage.deleteStudent(fullName);
    await expect(studentsPage.row(fullName)).toHaveCount(0);
  });
});

test.describe('Sibling Relationships', { tag: ['@5IT2'] }, () => {
  test('adding a sibling from one student is visible from the other student', async ({ page }) => {
    const studentA = uniqueName('sibling-a');
    const studentB = uniqueName('sibling-b');
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
    await expect(studentsPage.siblingListRow(fullNameB)).toBeVisible();
    await studentsPage.closeWizard();

    await studentsPage.toggleRowExpanded(fullNameA);
    await expect(studentsPage.visibleSiblingsSummary()).toContainText(fullNameB);
    await studentsPage.toggleRowExpanded(fullNameA);

    await studentsPage.toggleRowExpanded(fullNameB);
    await expect(studentsPage.visibleSiblingsSummary()).toContainText(fullNameA);
  });
});

test.describe('Student Endpoint Authorization', { tag: ['@5IT5'] }, () => {
  test('rejects an unauthenticated request to a student endpoint', async ({ page }) => {
    const response = await page.request.get('/api/students');

    expect(response.status()).toBe(401);
  });
});

test.describe('Student Wizard Modal Fixed Size', { tag: ['@5IT7'] }, () => {
  test('modal stays a fixed size while switching steps and the sibling list scrolls internally', async ({
    page,
  }) => {
    const primary = uniqueName('modal-fixed');
    const fullNamePrimary = `${primary.firstName} ${primary.lastName}`;
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createStudent({
      firstName: primary.firstName,
      lastName: primary.lastName,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });

    const siblingNames: string[] = [];
    for (let i = 0; i < 8; i++) {
      const sibling = uniqueName(`modal-fixed-sib-${i}`);
      await studentsPage.createStudent({
        firstName: sibling.firstName,
        lastName: sibling.lastName,
        dateOfBirth: '2013-09-05',
        grade: 'Grade5',
        class: 'E1',
        phase: 'Senior',
        language: 'Afrikaans',
      });
      siblingNames.push(`${sibling.firstName} ${sibling.lastName}`);
    }

    await studentsPage.row(fullNamePrimary).locator('.students-table__btn--edit').click();
    const cardBoxOnStudentStep = await studentsPage.wizardCard().boundingBox();

    await studentsPage.wizardModal.locator('#tabSiblings').click();
    const cardBoxOnSiblingsStep = await studentsPage.wizardCard().boundingBox();
    expect(cardBoxOnSiblingsStep).toEqual(cardBoxOnStudentStep);

    for (const siblingName of siblingNames) {
      await studentsPage.addSibling(siblingName);
    }

    const cardBoxAfterSiblingsAdded = await studentsPage.wizardCard().boundingBox();
    expect(cardBoxAfterSiblingsAdded).toEqual(cardBoxOnStudentStep);

    await expect(studentsPage.siblingsSearchSelect()).toBeVisible();

    const scrollEl = studentsPage.siblingListScrollElement();
    const scrollHeight = await scrollEl.evaluate((el) => el.scrollHeight);
    const clientHeight = await scrollEl.evaluate((el) => el.clientHeight);
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    await studentsPage.closeWizard();
  });

  test('modal stays a fixed size across create-mode Next/Previous transitions', async ({ page }) => {
    const student = uniqueName('modal-fixed-create');
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createButton.click();
    const cardBoxOnStudentStep = await studentsPage.wizardCard().boundingBox();

    const step = studentsPage.wizardModal.locator('#studentStep');
    await step.locator('#firstName').fill(student.firstName);
    await step.locator('#lastName').fill(student.lastName);
    await step.locator('#dateOfBirth').fill('2014-05-12');
    await step.locator('#grade').selectOption('Grade4');
    await step.locator('#class').selectOption('A1');
    await step.locator('#phase').selectOption('Junior');
    await step.locator('#language').selectOption('English');

    await studentsPage.wizardModal.locator('#nextBtn').click();
    const cardBoxOnSiblingsStep = await studentsPage.wizardCard().boundingBox();
    expect(cardBoxOnSiblingsStep).toEqual(cardBoxOnStudentStep);

    await studentsPage.wizardModal.locator('#previousBtn').click();
    const cardBoxAfterPrevious = await studentsPage.wizardCard().boundingBox();
    expect(cardBoxAfterPrevious).toEqual(cardBoxOnStudentStep);

    await studentsPage.closeWizard();
  });
});

test.describe('Student Enumeration Validation', { tag: ['@5IT4'] }, () => {
  test('rejects a request with a student field value outside its defined enumeration', async ({
    page,
  }) => {
    await goToStudentsPage(page);
    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));

    const response = await page.request.post('/api/students', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        firstName: 'Invalid',
        lastName: 'Enum',
        dateOfBirth: '2014-05-12',
        grade: 'NotARealGrade',
        class: 'A1',
        phase: 'Junior',
        language: 'English',
      },
    });

    expect(response.status()).toBe(400);
  });
});
