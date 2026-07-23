import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export type Grade =
  | 'Grade1'
  | 'Grade2'
  | 'Grade3'
  | 'Grade4'
  | 'Grade5'
  | 'Grade6'
  | 'Grade7'
  | 'Private';
export type StudentClass = 'A1' | 'A2' | 'E1' | 'E2' | 'E3' | 'E4';
export type Phase = 'Junior' | 'Senior';
export type StudentLanguage = 'Afrikaans' | 'English';

export interface StudentInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  grade: Grade;
  class: StudentClass;
  phase: Phase;
  language: StudentLanguage;
}

export class StudentsPage extends BasePage {
  readonly createButton: Locator;
  readonly wizardModal: Locator;
  readonly deleteModal: Locator;
  readonly filterNameInput: Locator;
  readonly filterGradeSelect: Locator;
  readonly filterPhaseSelect: Locator;
  readonly filterClassSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('#createBtn');
    this.wizardModal = page.locator('#wizardModal');
    this.deleteModal = page.locator('#deleteModal');
    this.filterNameInput = page.locator('#filterBar').locator('#name');
    this.filterGradeSelect = page.locator('#filterBar').locator('#grade');
    this.filterPhaseSelect = page.locator('#filterBar').locator('#phase');
    this.filterClassSelect = page.locator('#filterBar').locator('#class');
  }

  async gotoStudents(): Promise<void> {
    await this.goto('/#/students');
  }

  async createStudent(input: StudentInput): Promise<void> {
    await this.createButton.click();
    await this.fillStudentFields(input);
    await this.wizardModal.locator('#nextBtn').click();
    await this.wizardModal.locator('#saveBtn').click();
  }

  row(name: string): Locator {
    return this.page.locator('tr').filter({ hasText: name });
  }

  async editStudent(currentName: string, changes: Partial<StudentInput>): Promise<void> {
    await this.row(currentName).locator('.students-table__btn--edit').click();
    await this.fillStudentFields(changes);
    await this.wizardModal.locator('#saveBtn').click();
  }

  private async fillStudentFields(changes: Partial<StudentInput>): Promise<void> {
    const step = this.wizardModal.locator('#studentStep');
    if (changes.firstName) await step.locator('#firstName').fill(changes.firstName);
    if (changes.lastName) await step.locator('#lastName').fill(changes.lastName);
    if (changes.dateOfBirth) await step.locator('#dateOfBirth').fill(changes.dateOfBirth);
    if (changes.grade) await step.locator('#grade').selectOption(changes.grade);
    if (changes.class) await step.locator('#class').selectOption(changes.class);
    if (changes.phase) await step.locator('#phase').selectOption(changes.phase);
    if (changes.language) await step.locator('#language').selectOption(changes.language);
  }

  async filterByGrade(grade: Grade): Promise<void> {
    await this.filterGradeSelect.selectOption(grade);
  }

  async filterByName(name: string): Promise<void> {
    await this.filterNameInput.fill(name);
  }

  async clearFilters(): Promise<void> {
    await this.filterNameInput.fill('');
    await this.filterGradeSelect.selectOption('');
    await this.filterPhaseSelect.selectOption('');
    await this.filterClassSelect.selectOption('');
  }

  async deleteStudent(name: string): Promise<void> {
    await this.row(name).locator('.students-table__btn--delete').click();
    await this.deleteModal.locator('#deleteBtn').click();
  }

  /** Opens the Edit wizard for `name` and switches to its Siblings tab. */
  async openSiblingsTab(name: string): Promise<void> {
    await this.row(name).locator('.students-table__btn--edit').click();
    await this.wizardModal.locator('#tabSiblings').click();
  }

  async addSibling(siblingName: string): Promise<void> {
    const searchSelect = this.wizardModal.locator('#siblingsStep').locator('#searchSelect');
    await searchSelect.locator('#query').fill(siblingName);
    await searchSelect.locator('#results').getByRole('button', { name: siblingName }).click();
    await searchSelect.locator('#addBtn').click();
  }

  async removeSibling(siblingName: string): Promise<void> {
    await this.siblingListRow(siblingName).locator('.sibling-list__remove-btn').click();
  }

  siblingListRow(siblingName: string): Locator {
    return this.wizardModal
      .locator('#siblingsStep')
      .locator('#siblingList')
      .locator('tr')
      .filter({ hasText: siblingName });
  }

  async closeWizard(): Promise<void> {
    await this.wizardModal.locator('#cancelBtn').click();
  }

  /** The wizard modal's outer card element, whose fixed dimensions must not change between steps. */
  wizardCard(): Locator {
    return this.wizardModal.locator('.modal__card');
  }

  siblingsSearchSelect(): Locator {
    return this.wizardModal.locator('#siblingsStep').locator('#searchSelect');
  }

  /** The internal scroll container for the sibling list, several shadow roots deep. */
  siblingListScrollElement(): Locator {
    return this.wizardModal
      .locator('#siblingsStep')
      .locator('#siblingList')
      .locator('.sibling-list__scroll');
  }

  /** Toggles the expand chevron for `name`'s row (shows/hides its siblings summary). */
  async toggleRowExpanded(name: string): Promise<void> {
    await this.row(name).locator('.students-table__chevron-btn').click();
  }

  /**
   * The currently-expanded siblings summary panel. Collapsed rows keep their
   * summary component in the DOM (toggled via the `hidden` attribute on the
   * wrapping row), so scoping by visibility — rather than by name — avoids
   * matching a collapsed row's content. Callers should only have one row
   * expanded at a time to keep this unambiguous.
   */
  visibleSiblingsSummary(): Locator {
    return this.page.locator('pm-student-siblings-summary:visible');
  }
}
