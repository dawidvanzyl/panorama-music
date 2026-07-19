import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export type Grade = 'Grade1' | 'Grade2' | 'Grade3' | 'Grade4' | 'Grade5' | 'Grade6' | 'Grade7' | 'Private';
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
  readonly createForm: Locator;
  readonly editForm: Locator;
  readonly deleteModal: Locator;
  readonly filterNameInput: Locator;
  readonly filterGradeSelect: Locator;
  readonly filterPhaseSelect: Locator;
  readonly filterClassSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('#createBtn');
    this.createForm = page.locator('#createForm');
    this.editForm = page.locator('#editForm');
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
    await this.createForm.locator('#firstName').fill(input.firstName);
    await this.createForm.locator('#lastName').fill(input.lastName);
    await this.createForm.locator('#dateOfBirth').fill(input.dateOfBirth);
    await this.createForm.locator('#grade').selectOption(input.grade);
    await this.createForm.locator('#class').selectOption(input.class);
    await this.createForm.locator('#phase').selectOption(input.phase);
    await this.createForm.locator('#language').selectOption(input.language);
    await this.createForm.locator('#submitBtn').click();
  }

  row(name: string): Locator {
    return this.page.locator('tr').filter({ hasText: name });
  }

  async editStudent(currentName: string, changes: Partial<StudentInput>): Promise<void> {
    await this.row(currentName).locator('.students-table__btn--edit').click();

    if (changes.firstName) await this.editForm.locator('#firstName').fill(changes.firstName);
    if (changes.lastName) await this.editForm.locator('#lastName').fill(changes.lastName);
    if (changes.dateOfBirth) await this.editForm.locator('#dateOfBirth').fill(changes.dateOfBirth);
    if (changes.grade) await this.editForm.locator('#grade').selectOption(changes.grade);
    if (changes.class) await this.editForm.locator('#class').selectOption(changes.class);
    if (changes.phase) await this.editForm.locator('#phase').selectOption(changes.phase);
    if (changes.language) await this.editForm.locator('#language').selectOption(changes.language);

    await this.editForm.locator('#submitBtn').click();
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
}
