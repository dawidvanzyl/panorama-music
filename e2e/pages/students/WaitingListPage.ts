import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import type { StudentInput } from './StudentsPage';

export type OccurrenceLabel = 'During School' | 'After School';
export type LessonLabel = 'Individual' | 'Group';
export type DurationLabel = 'Hour' | 'Half Hour';
export type InstrumentLabel = 'Piano' | 'Guitar' | 'Recorder' | 'Keyboard' | 'Voice' | 'Other';

/** The Waiting List tab's own fields, addressed by their picker option labels. */
export interface WaitingListStepInput {
  occurrenceLabel: OccurrenceLabel;
  lessonLabel: LessonLabel;
  durationLabel: DurationLabel;
  instrumentLabel: InstrumentLabel;
  notes?: string;
}

export class WaitingListPage extends BasePage {
  readonly captureButton: Locator;
  readonly errorBanner: Locator;
  readonly successBanner: Locator;
  readonly emptyState: Locator;
  readonly wizardModal: Locator;

  constructor(page: Page) {
    super(page);
    this.captureButton = page.locator('pm-waiting-list-page #captureBtn');
    this.errorBanner = page.locator('pm-waiting-list-page #error');
    this.successBanner = page.locator('pm-waiting-list-page #success');
    this.emptyState = page.locator('pm-waiting-list-table #empty');
    this.wizardModal = page.locator('pm-waiting-list-page #wizardModal');
  }

  async gotoWaitingList(): Promise<void> {
    await this.goto('/#/waiting-list');
  }

  // --- Capture wizard (shared pm-student-wizard-modal, waiting-list mode) ---

  async openCaptureWizard(): Promise<void> {
    await this.captureButton.click();
  }

  /** The wizard's own tab strip, restricted to the tabs currently offered (not `hidden`). */
  visibleTabs(): Locator {
    return this.wizardModal.locator('.wizard__tab:not([hidden])');
  }

  studentTab(): Locator {
    return this.wizardModal.locator('#tabStudent');
  }

  siblingsTab(): Locator {
    return this.wizardModal.locator('#tabSiblings');
  }

  guardiansTab(): Locator {
    return this.wizardModal.locator('#tabGuardians');
  }

  waitingListTab(): Locator {
    return this.wizardModal.locator('#tabWaitingList');
  }

  coursesTab(): Locator {
    return this.wizardModal.locator('#tabCourses');
  }

  extraCurricularsTab(): Locator {
    return this.wizardModal.locator('#tabExtraCurriculars');
  }

  nextButton(): Locator {
    return this.wizardModal.locator('#nextBtn');
  }

  saveButton(): Locator {
    return this.wizardModal.locator('#saveBtn');
  }

  async goToNextStep(): Promise<void> {
    await this.nextButton().click();
  }

  async fillStudentFields(input: Partial<StudentInput>): Promise<void> {
    const step = this.wizardModal.locator('#studentStep');
    if (input.firstName) await step.locator('#firstName').fill(input.firstName);
    if (input.lastName) await step.locator('#lastName').fill(input.lastName);
    if (input.dateOfBirth) await step.locator('#dateOfBirth').fill(input.dateOfBirth);
    if (input.grade) await step.locator('#grade').selectOption(input.grade);
    if (input.class) await step.locator('#class').selectOption(input.class);
    if (input.phase) await step.locator('#phase').selectOption(input.phase);
    if (input.language) await step.locator('#language').selectOption(input.language);
  }

  waitingListStepMessage(): Locator {
    return this.wizardModal.locator('#waitingListStep').locator('#message');
  }

  async fillWaitingListFields(choice: WaitingListStepInput): Promise<void> {
    const step = this.wizardModal.locator('#waitingListStep');
    await step.locator('#occurrenceType').selectOption({ label: choice.occurrenceLabel });
    await step.locator('#lessonType').selectOption({ label: choice.lessonLabel });
    await step.locator('#durationType').selectOption({ label: choice.durationLabel });
    await step.locator('#instrumentType').selectOption({ label: choice.instrumentLabel });
    if (choice.notes !== undefined) await step.locator('#notes').fill(choice.notes);
  }

  async saveCapture(): Promise<void> {
    await this.saveButton().click();
  }

  /**
   * Drives the capture wizard end to end: Student tab, three Next clicks
   * (Siblings, Guardians, Waiting List — the wizard's waiting-list mode has no
   * Courses/Extra-Curriculars step to pass through), the Waiting List tab's
   * own fields, then Save. Leaves Siblings and Guardians untouched, matching
   * the design's own capture paths (S1, S4, S6), which stage neither.
   */
  async captureStudent(student: StudentInput, waitingList: WaitingListStepInput): Promise<void> {
    await this.openCaptureWizard();
    await this.fillStudentFields(student);
    await this.goToNextStep(); // Student -> Siblings
    await this.goToNextStep(); // Siblings -> Guardians
    await this.goToNextStep(); // Guardians -> Waiting List
    await this.fillWaitingListFields(waitingList);
    await this.saveCapture();
  }

  /** The occurrence-type group card, matched on its heading text. */
  group(occurrenceLabel: OccurrenceLabel): Locator {
    return this.page
      .locator('pm-waiting-list-table .wl-table__group')
      .filter({ has: this.page.getByRole('heading', { name: occurrenceLabel, exact: true }) });
  }

  groupHeader(occurrenceLabel: OccurrenceLabel): Locator {
    return this.group(occurrenceLabel).locator('.wl-table__group-header');
  }

  groupCount(occurrenceLabel: OccurrenceLabel): Locator {
    return this.group(occurrenceLabel).locator('.wl-table__group-count');
  }

  async toggleGroup(occurrenceLabel: OccurrenceLabel): Promise<void> {
    await this.groupHeader(occurrenceLabel).click();
  }

  rows(occurrenceLabel: OccurrenceLabel): Locator {
    return this.group(occurrenceLabel).locator('tbody tr');
  }

  /** The seeded student's own row, matched on their surname. */
  rowFor(occurrenceLabel: OccurrenceLabel, lastName: string): Locator {
    return this.rows(occurrenceLabel).filter({ hasText: lastName });
  }

  position(row: Locator): Locator {
    return row.locator('.wl-table__position');
  }

  studentName(row: Locator): Locator {
    return row.locator('.wl-table__student-name');
  }

  /** The secondary line: lesson type, duration type, instrument type, then date added. */
  meta(row: Locator): Locator {
    return row.locator('.wl-table__student-meta');
  }

  notesCell(row: Locator): Locator {
    return row.locator('.wl-table__notes');
  }

  actionsCell(row: Locator): Locator {
    return row.locator('.wl-table__actions');
  }

  readOnlyMarker(row: Locator): Locator {
    return row.locator('.wl-table__read-only');
  }

  enrolButton(row: Locator): Locator {
    return row.getByRole('button', { name: 'Enrol' });
  }

  editButton(row: Locator): Locator {
    return row.getByRole('button', { name: 'Edit' });
  }

  deleteButton(row: Locator): Locator {
    return row.getByRole('button', { name: 'Delete' });
  }
}
