import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class TeacherDetailPage extends BasePage {
  readonly header: Locator;
  readonly profileSection: Locator;
  readonly editButton: Locator;
  readonly editForm: Locator;
  readonly privateToggle: Locator;
  readonly classificationError: Locator;

  constructor(page: Page) {
    super(page);
    this.header = page.locator('#header');
    this.profileSection = page.locator('#profileSection');
    this.editButton = this.profileSection.locator('#editBtn');
    this.editForm = this.profileSection.locator('#editForm');
    this.privateToggle = this.profileSection.locator('#private');
    this.classificationError = this.profileSection.locator('#classificationError');
  }

  async gotoTeacher(teacherId: string): Promise<void> {
    await this.goto(`/#/teachers/${teacherId}`);
  }

  firstName(): Locator {
    return this.profileSection.locator('#firstName');
  }

  surname(): Locator {
    return this.profileSection.locator('#surname');
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

  /** Toggles the classification switch, which persists immediately. */
  async setPrivate(isPrivate: boolean): Promise<void> {
    await this.privateToggle.setChecked(isPrivate);
  }
}
