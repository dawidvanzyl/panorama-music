import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface CourseInput {
  /** The course type's display text, as offered in the dropdown. */
  courseTypeLabel: string;
  cost: string;
  /** The lesson structure's display text, as offered in the dropdown. */
  lessonStructureLabel: string;
}

export class CourseManagementPage extends BasePage {
  readonly courseForm: Locator;
  readonly filterBar: Locator;
  readonly courseTable: Locator;
  readonly deleteModal: Locator;

  constructor(page: Page) {
    super(page);
    this.courseForm = page.locator('#form');
    this.filterBar = page.locator('#filterBar');
    this.courseTable = page.locator('#table');
    this.deleteModal = page.locator('#deleteModal');
  }

  async gotoCourses(): Promise<void> {
    await this.goto('/#/courses');
  }

  /**
   * Re-fetches the catalogue from the server. Navigating to '/#/courses' while
   * already there is a same-document hash change, so it leaves the rendered
   * table — and any edit in progress — exactly as it was; only a reload proves
   * what was actually persisted.
   */
  async reloadCourses(): Promise<void> {
    await this.page.reload();
  }

  /** Rows are matched on their rendered display text, never on an enum member. */
  row(...cellTexts: string[]): Locator {
    return cellTexts.reduce<Locator>(
      (rows, text) => rows.filter({ hasText: text }),
      this.courseTable.locator('tbody tr'),
    );
  }

  rowCount(): Promise<number> {
    return this.courseTable.locator('tbody tr').count();
  }

  async createCourse(input: CourseInput): Promise<void> {
    await this.courseForm.locator('#courseType').selectOption({ label: input.courseTypeLabel });
    await this.courseForm.locator('#cost').fill(input.cost);
    await this.courseForm.locator('#lessonStructure').selectOption({ label: input.lessonStructureLabel });
    await this.courseForm.locator('#createBtn').click();
  }

  async filterByCourseType(label: string): Promise<void> {
    await this.filterBar.locator('#courseType').selectOption({ label });
  }

  /** The inline error banner a failed save or delete leaves in the table. */
  rowError(): Locator {
    return this.courseTable.locator('.course-table__error');
  }

  async startCostEdit(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'Edit Cost' }).click();
  }

  /**
   * The row under edit, which no longer shows its cost as text — the cell holds
   * the input instead, so a row matched on its displayed cost stops resolving
   * the moment the edit starts. Only one row is ever editable at a time.
   */
  editingRow(): Locator {
    return this.courseTable.locator('tbody tr').filter({ has: this.page.locator('#costInput') });
  }

  async enterCost(cost: string): Promise<void> {
    await this.editingRow().locator('#costInput').fill(cost);
  }

  async saveCost(): Promise<void> {
    await this.editingRow().getByRole('button', { name: 'Save' }).click();
  }

  async startDelete(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'Delete' }).click();
  }

  async confirmDelete(): Promise<void> {
    await this.deleteModal.locator('#deleteBtn').click();
  }

  async cancelDelete(): Promise<void> {
    await this.deleteModal.locator('#cancelBtn').click();
  }
}
