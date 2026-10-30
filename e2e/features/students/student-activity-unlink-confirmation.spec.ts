import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import { seedActivityOnlyStudent, seedEnrolledStudent, seedEnrollmentTarget } from '../../fixtures/enrollment';
import { assignActivity, seedActivity } from '../../fixtures/extraCurriculars';
import { blockRequests, countRequests } from '../../fixtures/modalFrame';
import { cancelModal, expectBold, visibleBody } from '../../fixtures/destructiveModal';
import { expectReversibleTemplate } from '../../fixtures/reversibleModal';
import { StudentsPage } from '../../pages/students/StudentsPage';

/**
 * Unlinking a student's activity asks for confirmation in the reversible
 * Unlink Activity modal. Every scenario seeds its own
 * course, activity and student.
 */
const ENROLL_BEFORE_REMOVING =
  'A student must have at least one course or one extra-curricular. Enroll in a course before removing this activity.';

function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

function uniqueDescription(label: string): string {
  return `e2e-${label}-${Date.now()}-${test.info().workerIndex}`;
}

interface Opened {
  studentsPage: StudentsPage;
  description: string;
  surname: string;
  studentId: string;
  deletePath: string;
}

/** Seeds an enrolled student holding one activity, and opens the wizard on its Extra-Curriculars step. */
async function openEnrolledStudent(page: Page, label: string): Promise<Opened> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const description = uniqueDescription(label);
  const { extraCurricularId } = await seedActivity(page, {
    description,
    phase: 'Junior',
    practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
  });
  const surname = uniqueSurname(label);
  const studentId = await seedEnrolledStudent(page, target, surname);
  await assignActivity(page, studentId, extraCurricularId);

  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
  await studentsPage.openExtraCurricularsTab(surname);
  await expect(studentsPage.assignedActivityRow(description)).toBeVisible();
  return {
    studentsPage,
    description,
    surname,
    studentId,
    deletePath: `/api/students/${studentId}/extra-curriculars/${extraCurricularId}`,
  };
}

test.describe('Students — Unlink Activity confirmation wording', { tag: ['@266IT21'] }, () => {
  test('S1 the row button opens the Unlink Activity confirmation above the wizard', async ({ page }) => {
    const { studentsPage, description, surname } = await openEnrolledStudent(page, 'act-wording');
    const modal = studentsPage.unlinkActivityModal;

    await studentsPage.unlinkActivity(description);

    await expectReversibleTemplate(modal, {
      title: 'Unlink Activity',
      body: `The activity ${description} will be unlinked from the student Amara ${surname}. The student no longer takes part in this activity. The activity record stays. You can link the activity again later.`,
      confirm: 'Unlink',
    });
    const strongs = visibleBody(modal).locator('strong');
    await expectBold(strongs.filter({ hasText: description }), description);
    await expectBold(strongs.filter({ hasText: `Amara ${surname}` }), `Amara ${surname}`);
    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');

    // The page host's shadow root holds both the wizard and the confirmation. Its
    // own hit test names the one painted on top at the centre of the card.
    const card = modal.locator('.modal__card');
    const box = await card.boundingBox();
    expect(box, 'the confirmation card has a box').not.toBeNull();
    const topmostId = await page.evaluate(
      ([x, y]) => {
        const host = document.querySelector('pm-students-page');
        const hit = host?.shadowRoot?.elementFromPoint(x, y);
        return hit?.id ?? hit?.tagName ?? null;
      },
      [box!.x + box!.width / 2, box!.y + box!.height / 2],
    );
    expect(topmostId).toBe('unlinkActivityModal');
  });

  test('S2 opening the confirmation unlinks nothing', async ({ page }) => {
    const { studentsPage, description, deletePath } = await openEnrolledStudent(page, 'act-open-only');
    const deletesSent = countRequests(page, 'DELETE', deletePath);

    await studentsPage.unlinkActivity(description);

    await expect(studentsPage.unlinkActivityModal.locator('.modal__card')).toBeVisible();
    expect(deletesSent()).toBe(0);
    await expect(studentsPage.assignedActivityRow(description)).toBeVisible();
  });

  test('S3 no course and one activity: refused without a confirmation', async ({ page }) => {
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const description = uniqueDescription('act-refused');
    const { extraCurricularId } = await seedActivity(page, {
      description,
      phase: 'Junior',
      practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
    });
    const surname = uniqueSurname('act-refused');
    const studentId = await seedActivityOnlyStudent(page, extraCurricularId, surname);
    const deletesSent = countRequests(page, 'DELETE', `/api/students/${studentId}/extra-curriculars/${extraCurricularId}`);

    await page.reload();
    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toBeVisible();
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.unlinkActivity(description);

    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(ENROLL_BEFORE_REMOVING);
    await expect(studentsPage.unlinkActivityModal.locator('.modal__card')).toBeHidden();
    expect(deletesSent()).toBe(0);
    await expect(studentsPage.assignedActivityRow(description)).toBeVisible();
  });
});

test.describe('Students — confirming an activity unlink', { tag: ['@266IT22'] }, () => {
  test('S1 confirming unlinks the activity, and it stays unlinked', async ({ page }) => {
    const { studentsPage, description, surname, deletePath } = await openEnrolledStudent(page, 'act-confirm');
    const deletesSent = countRequests(page, 'DELETE', deletePath);

    await studentsPage.unlinkActivityAndConfirm(description);

    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    expect(deletesSent()).toBe(1);
    await expect(studentsPage.assignedActivityRow(description)).toHaveCount(0);
    await expect(studentsPage.noActivitiesMessage()).toHaveText('No extra-curricular activities assigned.');

    await page.reload();
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toBeVisible();
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText('No extra-curricular activities assigned.');
    await expect(studentsPage.visibleCoursesSummary()).not.toContainText('No course enrollments.');
  });

  test('S2 a failed unlink shows in the confirmation and keeps it open', async ({ page }) => {
    const { studentsPage, description, deletePath } = await openEnrolledStudent(page, 'act-fail');
    const modal = studentsPage.unlinkActivityModal;
    const blocked = await blockRequests(page, 'DELETE', deletePath);

    await studentsPage.unlinkActivity(description);
    await expect(modal.getByTestId('modal-error')).toHaveText('');
    await modal.getByRole('button', { name: 'Unlink', exact: true }).click();

    await expect(modal.getByTestId('modal-error')).toHaveText('Blocked by the spec');
    await expect(modal.locator('.modal__card')).toBeVisible();
    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    expect(blocked()).toBe(1);

    await cancelModal(modal);
    await expect(studentsPage.assignedActivityRow(description)).toBeVisible();
  });
});

test.describe('Students — cancelling an activity unlink', { tag: ['@266IT23'] }, () => {
  test('S1 Cancel closes and unlinks nothing', async ({ page }) => {
    const { studentsPage, description, surname, deletePath } = await openEnrolledStudent(page, 'act-cancel');
    const deletesSent = countRequests(page, 'DELETE', deletePath);

    await studentsPage.unlinkActivity(description);
    await cancelModal(studentsPage.unlinkActivityModal);

    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    await expect(studentsPage.extraCurricularsStep()).toBeVisible();
    expect(deletesSent()).toBe(0);
    await expect(studentsPage.assignedActivityRow(description)).toBeVisible();

    await studentsPage.closeWizard();
    await studentsPage.openExtraCurricularsTab(surname);
    await expect(studentsPage.assignedActivityRow(description)).toBeVisible();
  });
});

test.describe('Students — the Unlink Activity close control', { tag: ['@266IT41'] }, () => {
  test('S1 the close control closes only the confirmation', async ({ page }) => {
    const { studentsPage, description, deletePath } = await openEnrolledStudent(page, 'act-close');
    const modal = studentsPage.unlinkActivityModal;
    const deletesSent = countRequests(page, 'DELETE', deletePath);

    await studentsPage.unlinkActivity(description);
    await modal.getByRole('button', { name: 'Close', exact: true }).click();

    await expect(modal.locator('.modal__card')).toBeHidden();
    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    await expect(studentsPage.extraCurricularsStep()).toBeVisible();
    expect(deletesSent()).toBe(0);
    await expect(studentsPage.assignedActivityRow(description)).toBeVisible();
  });
});
