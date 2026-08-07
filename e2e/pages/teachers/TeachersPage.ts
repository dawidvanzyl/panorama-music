import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface TeacherInput {
  firstName: string;
  surname: string;
  isPrivate?: boolean;
  /** The email of the login account to link while creating. */
  linkedAccountEmail?: string;
}

export class TeachersPage extends BasePage {
  readonly createSection: Locator;
  readonly createAccountPicker: Locator;
  readonly filterBar: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.createSection = page.locator('#createSection');
    this.createAccountPicker = this.createSection.locator('#accountPicker').locator('#account');
    this.filterBar = page.locator('#filterBar');
    this.errorBanner = page.locator('#error');
  }

  async gotoTeachers(): Promise<void> {
    await this.goto('/#/teachers');
  }

  row(name: string): Locator {
    return this.page.locator('pm-teacher-row').filter({ hasText: name });
  }

  /** Fills the permanently-inline create section and submits it. */
  async createTeacher(input: TeacherInput): Promise<void> {
    await this.createSection.locator('#firstName').fill(input.firstName);
    await this.createSection.locator('#surname').fill(input.surname);
    if (input.isPrivate) {
      await this.createSection.locator('#private').setChecked(true);
    }
    if (input.linkedAccountEmail) {
      await this.createAccountPicker.selectOption({ label: input.linkedAccountEmail });
    }
    await this.createSection.locator('#saveBtn').click();
  }

  async openTeacher(name: string): Promise<void> {
    await this.row(name).locator('#openBtn').click();
  }

  /** The account column on a roster row: the linked email, or the empty state. */
  linkedAccount(name: string): Locator {
    return this.row(name).locator('#account');
  }

  async filterByType(type: 'private' | 'school-paid' | ''): Promise<void> {
    await this.filterBar.locator('#type').selectOption(type);
  }
}
