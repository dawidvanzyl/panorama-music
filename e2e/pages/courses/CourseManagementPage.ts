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
  readonly summary: Locator;

  constructor(page: Page) {
    super(page);
    this.courseForm = page.locator('#form');
    this.filterBar = page.locator('#filterBar');
    this.courseTable = page.locator('#table');
    this.summary = page.locator('pm-course-management-page #summary');
  }

  async gotoCourses(): Promise<void> {
    await this.goto('/#/courses');
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
}
