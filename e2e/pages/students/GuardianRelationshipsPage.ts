import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class GuardianRelationshipsPage extends BasePage {
  readonly createButton: Locator;
  readonly relationshipForm: Locator;
  readonly relationshipList: Locator;
  readonly errorBanner: Locator;
  readonly deleteModal: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('#createBtn');
    this.relationshipForm = page.locator('#form');
    this.relationshipList = page.locator('#list');
    this.errorBanner = page.locator('#error');
    this.deleteModal = page.locator('#deleteModal');
  }

  async gotoGuardianRelationships(): Promise<void> {
    await this.goto('/#/students/guardian-relationships');
  }

  row(name: string): Locator {
    return this.relationshipList.locator('tr').filter({ hasText: name });
  }

  async createRelationship(name: string): Promise<void> {
    await this.createButton.click();
    await this.relationshipForm.locator('#name').fill(name);
    await this.relationshipForm.locator('#saveBtn').click();
  }

  /**
   * The row is re-located after Edit is clicked: inline editing replaces the name
   * cell with an input, so the row no longer matches a hasText filter on the old
   * name. Only one row can be in edit mode at a time, so the input identifies it.
   */
  async renameRelationship(currentName: string, newName: string): Promise<void> {
    await this.row(currentName).getByRole('button', { name: 'Edit' }).click();

    const editingRow = this.relationshipList
      .locator('tr')
      .filter({ has: this.page.locator('input') });
    await editingRow.locator('input').fill(newName);
    await editingRow.getByRole('button', { name: 'Save' }).click();
  }

  /** Clicks Delete on the row and confirms in the modal it opens. */
  async deleteRelationship(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await this.deleteModal.locator('#deleteBtn').click();
  }

  async cancelDeleteRelationship(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await this.deleteModal.locator('#cancelBtn').click();
  }

  /**
   * Clicks Delete without confirming — used to assert that a type already in
   * use is refused up front rather than opening the confirmation.
   */
  async clickDeleteRelationship(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
  }
}
