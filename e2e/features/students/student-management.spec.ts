import { test, expect } from '../../fixtures/base';
import { goToStudentsPage } from '../../fixtures/testUsers';

function uniqueName(label: string): { firstName: string; lastName: string } {
  return { firstName: `E2E-${label}`, lastName: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
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
    await expect(studentsPage.row(fullName)).toContainText('Grade4');

    await studentsPage.editStudent(fullName, { grade: 'Grade5', phase: 'Senior' });

    await expect(studentsPage.row(fullName)).toContainText('Grade5');
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
