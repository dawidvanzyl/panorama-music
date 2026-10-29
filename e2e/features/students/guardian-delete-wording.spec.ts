import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { fetchGuardians } from '../../fixtures/guardians';
import {
  openStudents,
  seedGuardian,
  seedSiblingLink,
  seedStudent,
  signInToSeed,
  uniqueToken,
} from '../../fixtures/studentPrint';
import { cancelModal, expectBold, expectDestructiveTemplate, visibleBody } from '../../fixtures/destructiveModal';
import type { StudentsPage } from '../../pages/students/StudentsPage';

const SCOPE_ONE = 'Unlink from this student only — the guardian record and the other sibling links stay.';
const SCOPE_ALL =
  "Delete the guardian and all links — the guardian record and every sibling's link are permanently removed.";

interface SiblingsSharingGuardian {
  tokenA: string;
  tokenB: string;
  studentA: string;
  studentB: string;
  guardianId: string;
  guardianName: string;
  guardianToken: string;
}

/** Siblings A and B, with one guardian added after the link so both hold it. */
async function seedSiblingsSharingGuardian(page: Page): Promise<SiblingsSharingGuardian> {
  const tokenA = uniqueToken();
  const tokenB = uniqueToken();
  const guardianToken = uniqueToken();
  const target = await signInToSeed(page);
  const studentA = await seedStudent(page, target, { firstName: 'Ava', lastName: tokenA });
  const studentB = await seedStudent(page, target, { firstName: 'Ben', lastName: tokenB });
  await seedSiblingLink(page, studentA, studentB);
  const guardian = await seedGuardian(page, studentA, { surname: guardianToken });
  await expect
    .poll(async () => (await fetchGuardians(page, studentB)).some((g) => g.guardianId === guardian.guardianId))
    .toBe(true);
  return {
    tokenA,
    tokenB,
    studentA,
    studentB,
    guardianId: guardian.guardianId,
    guardianName: guardian.fullName,
    guardianToken,
  };
}

async function openGuardianDelete(page: Page, seeded: SiblingsSharingGuardian): Promise<StudentsPage> {
  const studentsPage = await openStudents(page, seeded.tokenA);
  await studentsPage.openGuardiansTab(seeded.tokenA);
  await studentsPage.guardianListRow(seeded.guardianToken).locator('.guardian-list__btn--delete').click();
  return studentsPage;
}

async function isLinked(page: Page, studentId: string, guardianId: string): Promise<boolean> {
  return (await fetchGuardians(page, studentId)).some((g) => g.guardianId === guardianId);
}

test.describe('Delete Guardian modal — one student', { tag: ['@266IT5'] }, () => {
  test('S1 a guardian of one student gets the plain delete body and no choice', async ({ page }) => {
    const studentToken = uniqueToken();
    const guardianToken = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Wording', lastName: studentToken });
    const guardian = await seedGuardian(page, studentId, { surname: guardianToken });
    const studentsPage = await openStudents(page, studentToken);

    await studentsPage.openGuardiansTab(studentToken);
    await studentsPage.guardianListRow(guardianToken).locator('.guardian-list__btn--delete').click();

    const modal = studentsPage.deleteGuardianModal;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Guardian',
      body: `This action cannot be undone. The guardian ${guardian.fullName} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expect(modal.locator('#plainBody')).toBeVisible();
    await expectBold(modal.locator('#modalNamePlain'), guardian.fullName);
    await expect(modal.locator('#scopeChoice')).toBeHidden();
    await expect(modal.locator('#restrictedBody')).toBeHidden();
    await expect(modal.locator('input[type="radio"]:visible')).toHaveCount(0);

    await cancelModal(modal);
    await expect(studentsPage.guardianListRow(guardianToken)).toBeVisible();
  });
});

test.describe('Delete Guardian modal — shared with siblings, the two options', { tag: ['@266IT55'] }, () => {
  test('S1 two options in action and consequence form, unlink-only selected', async ({ page }) => {
    const seeded = await seedSiblingsSharingGuardian(page);
    const studentsPage = await openGuardianDelete(page, seeded);

    const modal = studentsPage.deleteGuardianModal;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Guardian',
      body: `This action cannot be undone. The guardian ${seeded.guardianName} is shared with siblings. Choose one option.`,
      confirm: 'Delete',
    });
    await expectBold(modal.locator('#modalNameScoped'), seeded.guardianName);
    await expect(modal.locator('#scopeChoice')).toBeVisible();
    await expect(modal.locator('#plainBody')).toBeHidden();
    await expect(modal.locator('#restrictedBody')).toBeHidden();

    await expect(modal.locator('input[type="radio"]:visible')).toHaveCount(2);
    await expect(modal.getByLabel(SCOPE_ONE, { exact: true })).toBeChecked();
    await expect(modal.getByLabel(SCOPE_ALL, { exact: true })).not.toBeChecked();
    await expect(visibleBody(modal)).toHaveCount(1);

    await cancelModal(modal);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toBeVisible();
  });

  test('S2 the default resets on reopen', async ({ page }) => {
    const seeded = await seedSiblingsSharingGuardian(page);
    const studentsPage = await openGuardianDelete(page, seeded);
    const modal = studentsPage.deleteGuardianModal;

    await modal.getByLabel(SCOPE_ALL, { exact: true }).check();
    await expect(modal.getByLabel(SCOPE_ALL, { exact: true })).toBeChecked();
    await cancelModal(modal);

    await studentsPage.guardianListRow(seeded.guardianToken).locator('.guardian-list__btn--delete').click();
    await expect(modal.locator('.modal__card')).toBeVisible();
    await expect(modal.getByLabel(SCOPE_ONE, { exact: true })).toBeChecked();
    await expect(modal.getByLabel(SCOPE_ALL, { exact: true })).not.toBeChecked();

    await cancelModal(modal);
  });
});

test.describe('Delete Guardian modal — unlink-only option', { tag: ['@266IT56'] }, () => {
  test('S1 the default option unlinks from this sibling only', async ({ page }) => {
    const seeded = await seedSiblingsSharingGuardian(page);
    const studentsPage = await openGuardianDelete(page, seeded);
    const modal = studentsPage.deleteGuardianModal;

    await modal.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(modal.locator('.modal__card')).toBeHidden();
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toHaveCount(0);

    await studentsPage.closeWizard();
    await studentsPage.filterByName(seeded.tokenB);
    await studentsPage.openGuardiansTab(seeded.tokenB);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toBeVisible();
    await studentsPage.closeWizard();

    await openStudents(page, seeded.tokenA);
    await studentsPage.openGuardiansTab(seeded.tokenA);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toHaveCount(0);
    await studentsPage.closeWizard();

    expect(await isLinked(page, seeded.studentA, seeded.guardianId)).toBe(false);
    expect(await isLinked(page, seeded.studentB, seeded.guardianId)).toBe(true);

    await openStudents(page, seeded.tokenB);
    await studentsPage.openGuardiansTab(seeded.tokenB);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toBeVisible();
  });
});

test.describe('Delete Guardian modal — delete-all option', { tag: ['@266IT57'] }, () => {
  test('S1 the delete-all option removes the guardian from both siblings', async ({ page }) => {
    const seeded = await seedSiblingsSharingGuardian(page);
    const studentsPage = await openGuardianDelete(page, seeded);
    const modal = studentsPage.deleteGuardianModal;

    await modal.getByLabel(SCOPE_ALL, { exact: true }).check();
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(modal.locator('.modal__card')).toBeHidden();
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toHaveCount(0);

    await studentsPage.closeWizard();
    await studentsPage.filterByName(seeded.tokenB);
    await studentsPage.openGuardiansTab(seeded.tokenB);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toHaveCount(0);
    await studentsPage.closeWizard();

    await openStudents(page, seeded.tokenA);
    await studentsPage.openGuardiansTab(seeded.tokenA);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toHaveCount(0);
    await studentsPage.closeWizard();

    await openStudents(page, seeded.tokenB);
    await studentsPage.openGuardiansTab(seeded.tokenB);
    await expect(studentsPage.guardianListRow(seeded.guardianToken)).toHaveCount(0);

    expect(await isLinked(page, seeded.studentA, seeded.guardianId)).toBe(false);
    expect(await isLinked(page, seeded.studentB, seeded.guardianId)).toBe(false);
  });
});
