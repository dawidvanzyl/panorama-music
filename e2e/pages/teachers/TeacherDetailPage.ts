import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class TeacherDetailPage extends BasePage {
  readonly header: Locator;
  readonly profileSection: Locator;
  readonly editButton: Locator;
  readonly editForm: Locator;
  readonly privateToggle: Locator;
  readonly classificationError: Locator;
  readonly accountBadge: Locator;
  readonly unlinkButton: Locator;
  readonly linkButton: Locator;
  readonly linkModal: Locator;
  readonly accountPicker: Locator;
  readonly linkModalConfirm: Locator;
  readonly unlinkModal: Locator;
  readonly unlinkModalConfirm: Locator;
  readonly linkNotice: Locator;
  readonly errorBanner: Locator;
  readonly bankingSection: Locator;
  readonly bankingEmptyState: Locator;
  readonly bankingAddButton: Locator;
  readonly bankingEditButton: Locator;
  readonly bankingDeleteButton: Locator;
  readonly bankingRevealButton: Locator;
  readonly bankingRevealNote: Locator;
  readonly bankingAccountNumber: Locator;
  readonly bankingForm: Locator;
  readonly bankingDeleteModal: Locator;
  readonly bankingDeleteModalConfirm: Locator;
  readonly bankingActivityButton: Locator;
  readonly bankingActivityModal: Locator;
  readonly bankingActivityRows: Locator;
  readonly statusChip: Locator;
  readonly deactivateButton: Locator;
  readonly reactivateButton: Locator;
  readonly deleteButton: Locator;
  readonly deactivateModal: Locator;
  readonly deactivateModalConfirm: Locator;
  readonly deleteModal: Locator;
  readonly deleteModalConfirm: Locator;

  constructor(page: Page) {
    super(page);
    this.header = page.locator('#header');
    this.profileSection = page.locator('#profileSection');
    this.editButton = this.profileSection.locator('#editBtn');
    this.editForm = this.profileSection.locator('#editForm');
    this.privateToggle = this.profileSection.locator('#private');
    this.classificationError = this.profileSection.locator('#classificationError');
    this.accountBadge = this.header.locator('#accountBadge');
    this.unlinkButton = this.header.locator('#unlinkBtn');
    this.linkButton = this.header.locator('#linkBtn');
    this.linkModal = page.locator('#linkModal');
    this.accountPicker = this.linkModal.locator('#picker').locator('#account');
    this.linkModalConfirm = this.linkModal.locator('#linkBtn');
    this.unlinkModal = page.locator('#unlinkModal');
    this.unlinkModalConfirm = this.unlinkModal.locator('#unlinkBtn');
    this.linkNotice = page.locator('#linkNotice');
    this.errorBanner = page.locator('#error');
    this.bankingSection = page.locator('#bankingSection');
    this.bankingEmptyState = this.bankingSection.locator('#emptyView');
    this.bankingAddButton = this.bankingSection.locator('#addBtn');
    this.bankingEditButton = this.bankingSection.locator('#editBtn');
    this.bankingDeleteButton = this.bankingSection.locator('#deleteBtn');
    this.bankingRevealButton = this.bankingSection.locator('#revealBtn');
    this.bankingRevealNote = this.bankingSection.locator('#revealNote');
    this.bankingAccountNumber = this.bankingSection.locator('#accountNumberValue');
    this.bankingForm = this.bankingSection.locator('#formView');
    this.bankingDeleteModal = page.locator('#bankingDeleteModal');
    this.bankingDeleteModalConfirm = this.bankingDeleteModal.locator('#deleteBtn');
    this.bankingActivityButton = this.header.locator('#bankingActivityBtn');
    this.bankingActivityModal = page.locator('#bankingActivityModal');
    this.bankingActivityRows = this.bankingActivityModal.locator('#rows tr');
    this.statusChip = this.header.locator('#statusChip');
    this.deactivateButton = this.header.locator('#deactivateBtn');
    this.reactivateButton = this.header.locator('#reactivateBtn');
    this.deleteButton = this.header.locator('#deleteBtn');
    this.deactivateModal = page.locator('#deactivateModal');
    this.deactivateModalConfirm = this.deactivateModal.locator('#deactivateBtn');
    this.deleteModal = page.locator('#deleteModal');
    this.deleteModalConfirm = this.deleteModal.locator('#deleteBtn');
  }

  /** Opens the deactivate confirmation and confirms it. */
  async deactivate(): Promise<void> {
    await this.deactivateButton.click();
    await this.deactivateModalConfirm.click();
    // The reactivate action appearing is what says the change has come back.
    await this.reactivateButton.waitFor({ state: 'visible' });
  }

  /** Opens the permanent-delete confirmation and confirms it. */
  async deleteTeacher(): Promise<void> {
    await this.deleteButton.click();
    await this.deleteModalConfirm.click();
  }

  /**
   * Fills and submits the banking form. The account number is omitted on an
   * edit that keeps the stored one — it cannot be read back into the field.
   */
  async saveBankingDetails(input: {
    bank: string;
    accountType: string;
    branchCode: string;
    accountNumber?: string;
  }): Promise<void> {
    await this.bankingForm.locator('#bankInput').selectOption(input.bank);
    await this.bankingForm.locator('#accountTypeInput').selectOption(input.accountType);
    await this.bankingForm.locator('#branchCodeInput').fill(input.branchCode);
    if (input.accountNumber) {
      await this.bankingForm.locator('#accountNumberInput').fill(input.accountNumber);
    }
    await this.bankingForm.locator('#submitBtn').click();
    // The form only closes once the save has come back, so waiting for that is
    // what makes the details actually readable afterwards. Without it a caller
    // that goes straight to the API races its own write.
    await this.bankingForm.waitFor({ state: 'hidden' });
  }

  async captureBankingDetails(input: {
    bank: string;
    accountType: string;
    branchCode: string;
    accountNumber: string;
  }): Promise<void> {
    await this.bankingAddButton.click();
    await this.saveBankingDetails(input);
  }

  async deleteBankingDetails(): Promise<void> {
    await this.bankingDeleteButton.click();
    await this.bankingDeleteModalConfirm.click();
    // Same reasoning as saveBankingDetails: the empty state appearing is what
    // says the delete has come back.
    await this.bankingEmptyState.waitFor({ state: 'visible' });
  }

  async gotoTeacher(teacherId: string): Promise<void> {
    await this.goto(`/#/teachers/${teacherId}`);
  }

  // Scoped to the read view: Playwright pierces shadow roots, so an unscoped
  // #firstName also matches the edit form's input of the same id.
  firstName(): Locator {
    return this.profileSection.locator('#readView #firstName');
  }

  surname(): Locator {
    return this.profileSection.locator('#readView #surname');
  }

  typeChip(): Locator {
    return this.header.locator('#typeChip');
  }

  /** Edits the profile names only — the classification is not part of this flow. */
  async editNames(firstName: string, surname: string): Promise<void> {
    await this.editButton.click();
    await this.editForm.locator('#firstName').fill(firstName);
    await this.editForm.locator('#surname').fill(surname);
    await this.editForm.locator('#saveBtn').click();
  }

  /** Opens the link modal, picks an account, and confirms. */
  async linkAccount(accountEmail: string): Promise<void> {
    await this.linkButton.click();
    await this.accountPicker.selectOption({ label: accountEmail });
    await this.linkModalConfirm.click();
  }

  /** Opens the unlink confirmation and confirms it. */
  async unlinkAccount(): Promise<void> {
    await this.unlinkButton.click();
    await this.unlinkModalConfirm.click();
  }

  /** Toggles the classification switch, which persists immediately. */
  async setPrivate(isPrivate: boolean): Promise<void> {
    await this.privateToggle.setChecked(isPrivate);
  }
}
