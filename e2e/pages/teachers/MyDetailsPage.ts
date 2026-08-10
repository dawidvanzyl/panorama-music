import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * A teacher's own record, reached from the account chip in the header rather
 * than from the teachers list — which a teacher who is neither Admin nor
 * Coordinator does not have.
 */
export class MyDetailsPage extends BasePage {
  readonly accountChip: Locator;
  readonly accountMenu: Locator;
  readonly myDetailsItem: Locator;
  readonly modal: Locator;
  readonly classification: Locator;
  readonly editButton: Locator;
  readonly editForm: Locator;
  readonly bankingSection: Locator;
  readonly bankingEmptyState: Locator;
  readonly bankingAddButton: Locator;
  readonly bankingEditButton: Locator;
  readonly bankingDeleteButton: Locator;
  readonly bankingRevealButton: Locator;
  readonly bankingActivityButton: Locator;
  readonly bankingAccountNumber: Locator;
  readonly bankingForm: Locator;
  readonly bankingDeleteModal: Locator;
  readonly bankingDeleteModalConfirm: Locator;
  readonly bankingActivityModal: Locator;
  readonly bankingActivityRows: Locator;

  constructor(page: Page) {
    super(page);
    this.accountChip = page.locator('pm-nav-bar #accountChip');
    this.accountMenu = page.locator('pm-nav-bar #accountMenu');
    this.myDetailsItem = page.locator('pm-my-details-menu #openBtn');
    this.modal = page.locator('pm-my-details-modal');
    this.classification = this.modal.locator('.my-details__classification');
    // The banking section inside the modal carries an #editBtn of its own.
    this.editButton = this.modal.locator('.my-details__edit-btn');
    this.editForm = this.modal.locator('#editForm');
    this.bankingSection = this.modal.locator('#bankingSection');
    this.bankingEmptyState = this.bankingSection.locator('#emptyView');
    this.bankingAddButton = this.bankingSection.locator('#addBtn');
    this.bankingEditButton = this.bankingSection.locator('#editBtn');
    this.bankingDeleteButton = this.bankingSection.locator('#deleteBtn');
    this.bankingRevealButton = this.bankingSection.locator('#revealBtn');
    this.bankingActivityButton = this.bankingSection.locator('#activityBtn');
    this.bankingAccountNumber = this.bankingSection.locator('#accountNumberValue');
    this.bankingForm = this.bankingSection.locator('#formView');
    this.bankingDeleteModal = page.locator('pm-banking-delete-modal');
    this.bankingDeleteModalConfirm = this.bankingDeleteModal.locator('#deleteBtn');
    this.bankingActivityModal = page.locator('pm-banking-activity-modal');
    this.bankingActivityRows = this.bankingActivityModal.locator('#rows tr');
  }

  /** Opens the account chip and the own-record view behind it. */
  async open(): Promise<void> {
    await this.accountChip.click();
    await this.myDetailsItem.click();
    // The host element wraps a fixed-position backdrop and so has no geometry
    // of its own; the card inside it is what actually becomes visible.
    await this.modal.locator('.modal__card').waitFor({ state: 'visible' });
  }

  async close(): Promise<void> {
    await this.modal.locator('#closeBtn').click();
    await this.modal.locator('.modal__card').waitFor({ state: 'hidden' });
  }

  async editNames(firstName: string, surname: string): Promise<void> {
    await this.editButton.click();
    await this.editForm.locator('#firstName').fill(firstName);
    await this.editForm.locator('#surname').fill(surname);
    await this.editForm.locator('#saveBtn').click();
    await this.editForm.waitFor({ state: 'hidden' });
  }

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
    // The form closing is what says the save has come back.
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
    await this.bankingEmptyState.waitFor({ state: 'visible' });
  }

  firstName(): Locator {
    return this.modal.locator('#readView #firstName');
  }

  surname(): Locator {
    return this.modal.locator('#readView #surname');
  }
}
