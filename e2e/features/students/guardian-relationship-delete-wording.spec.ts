import { test, expect } from '../../fixtures/base';
import { goToGuardianRelationshipsPage } from '../../fixtures/testUsers';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../fixtures/destructiveModal';

function uniqueRelationshipName(): string {
  return `E2E-word-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

test.describe('Delete Relationship modal — destructive wording', { tag: ['@266IT4'] }, () => {
  test('S1 the Delete Relationship modal says relationship', async ({ page }) => {
    const name = uniqueRelationshipName();
    const relationshipsPage = await goToGuardianRelationshipsPage(page);
    await relationshipsPage.createRelationship(name);
    await expect(relationshipsPage.row(name)).toBeVisible();

    await relationshipsPage.clickDeleteRelationship(name);

    const modal = relationshipsPage.deleteModal;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Relationship',
      body: `This action cannot be undone. The relationship ${name} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(modal.locator('#modalName'), name);

    await cancelModal(modal);
    await expect(relationshipsPage.row(name)).toBeVisible();
  });
});
