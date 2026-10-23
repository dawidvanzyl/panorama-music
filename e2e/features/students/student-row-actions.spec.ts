import { test, expect } from '../../fixtures/base';
import { seedEnrolledStudent } from '../../fixtures/enrollment';
import { actionNames } from '../../fixtures/rowActions';
import { openStudents, seedSiblingLink, seedStudent, signInToSeed, uniqueToken } from '../../fixtures/studentPrint';
import { StudentsPage, type StudentInput } from '../../pages/students/StudentsPage';

test.describe('Students — row action verbs', { tag: ['@267IT17'] }, () => {
  test('S1 a collapsed row reads Edit, Delete', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const studentsPage = await openStudents(page, token);

    const row = studentsPage.rosterRow(token);
    await expect(row).toBeVisible();

    expect(await actionNames(row)).toEqual(['Edit', 'Delete']);
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
  });

  test('S2 expanding keeps the row at Edit, Delete; Print stays in the expanded view', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, studentId);

    expect(await actionNames(studentsPage.rosterRow(token))).toEqual(['Edit', 'Delete']);
    await expect(studentsPage.printButtonOf(studentId)).toBeVisible();
    await expect(studentsPage.rosterRow(token).getByRole('button', { name: 'Print', exact: true })).toHaveCount(0);
  });

  test('S3 Delete asks before acting', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.rosterRow(token).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(studentsPage.deleteModal).toHaveAttribute('open', '');
    await studentsPage.deleteModal.locator('#cancelBtn').click();
    await expect(studentsPage.deleteModal).not.toHaveAttribute('open', '');

    await openStudents(page, token);
    await expect(studentsPage.row(token)).toBeVisible();
  });
});

test.describe('Students — enrollment row action verbs', { tag: ['@267IT18'] }, () => {
  test('S1 a saved enrollment reads Edit then Withdraw', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedEnrolledStudent(page, target, token);
    const studentsPage = await openStudents(page, token);

    await studentsPage.openEditWizard(token);
    await studentsPage.tab('Courses').click();

    const row = studentsPage.enrollmentListRow(target.courseLabel);
    await expect(row).toBeVisible();
    expect(await actionNames(row)).toEqual(['Edit', 'Withdraw']);
    await expect(row.getByRole('button', { name: 'Change', exact: true })).toHaveCount(0);
  });

  test('S2 an unsaved enrollment reads Edit then Remove', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentsPage = new StudentsPage(page);
    await page.reload();
    await studentsPage.gotoStudents();
    const student: StudentInput = {
      firstName: 'Ava',
      lastName: token,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    };

    await studentsPage.startCreatingStudent(student);
    await studentsPage.goToNextStep(); // Student -> Siblings
    await studentsPage.goToNextStep(); // Siblings -> Guardians
    await studentsPage.goToNextStep(); // Guardians -> Courses
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });

    const row = studentsPage.enrollmentListRow(target.courseLabel);
    await expect(row).toBeVisible();
    expect(await actionNames(row)).toEqual(['Edit', 'Remove']);
    await expect(row.getByRole('button', { name: 'Change', exact: true })).toHaveCount(0);

    await studentsPage.closeWizard();
  });
});

test.describe('Students — sibling row action verb', { tag: ['@267IT19'] }, () => {
  test('S1 a linked sibling reads Unlink', async ({ page }) => {
    const token = uniqueToken();
    const siblingToken = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const siblingId = await seedStudent(page, target, { firstName: 'Ben', lastName: siblingToken });
    await seedSiblingLink(page, studentId, siblingId);
    const studentsPage = await openStudents(page, token);

    await studentsPage.openSiblingsTab(token);

    const row = studentsPage.siblingListRow(siblingToken);
    await expect(row).toBeVisible();
    expect(await actionNames(row)).toEqual(['Unlink']);
    await expect(row.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
  });

  test('S2 Unlink unlinks, and both students stay', async ({ page }) => {
    const token = uniqueToken();
    const siblingToken = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const siblingId = await seedStudent(page, target, { firstName: 'Ben', lastName: siblingToken });
    await seedSiblingLink(page, studentId, siblingId);
    const studentsPage = await openStudents(page, token);

    await studentsPage.openSiblingsTab(token);
    await expect(studentsPage.siblingListRow(siblingToken)).toBeVisible();
    await studentsPage.removeSibling(siblingToken);
    await expect(studentsPage.siblingListRow(siblingToken)).toHaveCount(0);
    await studentsPage.closeWizard();

    await openStudents(page, token);
    await studentsPage.openSiblingsTab(token);
    await expect(studentsPage.wizardModal.locator('#siblingsStep')).toBeVisible();
    await expect(studentsPage.siblingListRow(siblingToken)).toHaveCount(0);
    await studentsPage.closeWizard();

    await expect(studentsPage.row(token)).toBeVisible();
    await studentsPage.filterByName(siblingToken);
    await expect(studentsPage.row(siblingToken)).toBeVisible();
  });
});
