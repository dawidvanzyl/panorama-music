import { test, expect } from '../../fixtures/base';
import {
  openStudents,
  seedStudent,
  signInToSeed,
  twoCourseEnrolments,
  uniqueToken,
} from '../../fixtures/studentPrint';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../fixtures/destructiveModal';

test.describe('Delete Student modal — destructive wording', { tag: ['@266IT3'] }, () => {
  test('S1 the Delete Student modal has the delete template', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedStudent(page, target, { firstName: 'Wording', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.row(token).locator('.students-table__btn--delete').click();

    const modal = studentsPage.deleteModal;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Student',
      body: `This action cannot be undone. The student Wording ${token} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(modal.locator('#modalName'), `Wording ${token}`);

    await cancelModal(modal);
    await expect(studentsPage.row(token)).toBeVisible();
  });
});

test.describe('Withdraw Enrollment modal — destructive wording', { tag: ['@266IT10'] }, () => {
  test('S1 the withdraw template names the student and the course', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedStudent(page, target, {
      firstName: 'Wording',
      lastName: token,
      enrolments: await twoCourseEnrolments(page, target),
    });
    const studentsPage = await openStudents(page, token);

    await studentsPage.openCoursesTab(token);
    const row = studentsPage.enrollmentListRow(target.courseLabel);
    const course = (await row.locator('td').first().innerText()).trim();
    await row.locator('.enrollment-list__btn--withdraw').click();

    const modal = studentsPage.withdrawEnrollmentModal;
    await expectDestructiveTemplate(modal, {
      title: 'Withdraw Enrollment',
      body: `This action cannot be undone. Wording ${token} will be permanently withdrawn from ${course}.`,
      confirm: 'Withdraw',
    });
    await expectBold(modal.locator('#studentName'), `Wording ${token}`);
    await expectBold(modal.locator('#courseName'), course);

    await cancelModal(modal);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#enrollmentList tbody tr')).toHaveCount(2);
  });
});
