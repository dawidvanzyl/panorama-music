import { expect, type Locator, type Page } from '@playwright/test';
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
  class?: StudentClass;
  phase?: Phase;
  language: StudentLanguage;
}

export interface GuardianInput {
  firstName: string;
  surname: string;
  relationshipLabel: string;
  cell?: string;
  email?: string;
  receivesCorrespondence?: boolean;
  responsibleForPayment?: boolean;
  married?: boolean;
}

export type GuardianDeleteScope = 'one' | 'all';

export class StudentsPage extends BasePage {
  readonly createButton: Locator;
  readonly wizardModal: Locator;
  readonly deleteModal: Locator;
  readonly deleteGuardianModal: Locator;
  readonly filterNameInput: Locator;
  readonly filterGradeSelect: Locator;
  readonly filterPhaseSelect: Locator;
  readonly filterClassSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('#createBtn');
    this.wizardModal = page.locator('#wizardModal');
    this.deleteModal = page.locator('#deleteModal');
    this.deleteGuardianModal = page.locator('#deleteGuardianModal');
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
    await this.wizardModal.locator('#studentSaveBtn').click();
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
    // Wait for the add round trip (candidates refresh clears/re-renders #results) to settle
    // before a caller starts the next add — otherwise a rapid second fill/click can race the
    // re-render and hit a detached node.
    await expect(this.siblingListRow(siblingName)).toBeVisible();
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

  /**
   * Closes the wizard via whichever dismiss control is currently visible: the
   * shared footer's Cancel (create mode) or Close (edit mode's Siblings/Guardians
   * tabs, which persist their own changes and have nothing left to cancel), or
   * the Student tab's own local Cancel (edit mode). Scoped to the wizard's own
   * footer/step-actions rather than a bare role query, since a nested guardian
   * form also has its own "Cancel" button that could otherwise collide.
   */
  async closeWizard(): Promise<void> {
    const bottomDismiss = this.wizardModal.locator('.wizard__actions #cancelBtn');
    if (await bottomDismiss.isVisible()) {
      await bottomDismiss.click();
      return;
    }
    await this.wizardModal.locator('.wizard__step-actions #studentCancelBtn').click();
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

  /** Read-only guardians summary for the currently-expanded row (same scoping rule as siblings). */
  visibleGuardiansSummary(): Locator {
    return this.page.locator('pm-student-guardians-summary:visible');
  }

  /** Opens the Edit wizard for `name` and switches to its Guardians tab. */
  async openGuardiansTab(name: string): Promise<void> {
    await this.row(name).locator('.students-table__btn--edit').click();
    await this.wizardModal.locator('#tabGuardians').click();
  }

  async addGuardian(input: GuardianInput): Promise<void> {
    const step = this.wizardModal.locator('#guardiansStep');
    await step.locator('#addBtn').click();
    await this.fillGuardianFields(step, input);
    await step.locator('#guardianForm').locator('#confirmBtn').click();
    await expect(this.guardianListRow(`${input.firstName} ${input.surname}`)).toBeVisible();
  }

  async editGuardian(currentName: string, changes: Partial<GuardianInput>): Promise<void> {
    const step = this.wizardModal.locator('#guardiansStep');
    await this.guardianListRow(currentName).locator('.guardian-list__btn--edit').click();
    await this.fillGuardianFields(step, changes);
    await step.locator('#guardianForm').locator('#confirmBtn').click();
  }

  private async fillGuardianFields(step: Locator, changes: Partial<GuardianInput>): Promise<void> {
    const form = step.locator('#guardianForm');
    if (changes.firstName) await form.locator('#firstName').fill(changes.firstName);
    if (changes.surname) await form.locator('#surname').fill(changes.surname);
    if (changes.relationshipLabel) {
      await form.locator('#relationship').selectOption({ label: changes.relationshipLabel });
    }
    if (changes.cell !== undefined) await form.locator('#cell').fill(changes.cell);
    if (changes.email !== undefined) await form.locator('#email').fill(changes.email);
    if (changes.receivesCorrespondence !== undefined) {
      await form.locator('#receivesCorrespondence').setChecked(changes.receivesCorrespondence);
    }
    if (changes.responsibleForPayment !== undefined) {
      await form.locator('#responsibleForPayment').setChecked(changes.responsibleForPayment);
    }
    if (changes.married !== undefined) {
      await form.locator('#married').setChecked(changes.married);
    }
  }

  guardianListRow(name: string): Locator {
    return this.wizardModal
      .locator('#guardiansStep')
      .locator('#guardianList')
      .locator('tr')
      .filter({ hasText: name });
  }

  inheritedGuardianListRow(name: string): Locator {
    return this.wizardModal
      .locator('#guardiansStep')
      .locator('#inheritedList')
      .locator('tr')
      .filter({ hasText: name });
  }

  async deleteGuardian(name: string, scope: GuardianDeleteScope = 'one'): Promise<void> {
    await this.guardianListRow(name).locator('.guardian-list__btn--delete').click();
    if (await this.deleteGuardianModal.locator('#scopeChoice').isVisible()) {
      await this.deleteGuardianModal.locator(scope === 'all' ? '#scopeAll' : '#scopeOne').check();
    }
    await this.deleteGuardianModal.locator('#deleteBtn').click();
  }

  syncGuardiansButton(): Locator {
    return this.wizardModal.locator('#guardiansStep').locator('#syncBtn');
  }

  async syncGuardians(): Promise<void> {
    await this.syncGuardiansButton().click();
  }
}
