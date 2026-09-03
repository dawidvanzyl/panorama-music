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

export interface EnrollmentInput {
  courseLabel?: string;
  teacherName?: string;
  instrumentLabel?: string;
  stepLabel?: string;
  enrolledDate?: string;
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

  /** The wizard's own tab strip, restricted to the tabs currently offered (not `hidden`). */
  visibleTabs(): Locator {
    return this.wizardModal.locator('.wizard__tab:not([hidden])');
  }

  /**
   * Steps the create wizard through all five tabs (Student → Siblings →
   * Guardians → Courses → Extra-Curriculars) without adding any siblings or
   * guardians. Extra-Curriculars is the wizard's final step in create mode —
   * it carries Save, and Courses only offers Next — so all four Next clicks
   * are required.
   *
   * A Private-grade student has no Extra-Curriculars step at all (R9):
   * Courses is their final step and carries Save directly, so only three
   * Next clicks happen and `activityOptionLabels` is meaningless for them —
   * passing any is a caller error, not something this silently tolerates.
   *
   * A student must be enrolled in at least one course, so the Courses tab
   * always stages one. Callers that do not care which pass no `enrollment` and
   * get the first course and teacher on offer.
   *
   * `activityOptionLabels` stages zero or more activities on the
   * Extra-Curriculars step before Save — each one is the picker's option
   * label, which is the activity's description alone (per #278's R11
   * display correction). Staging in create mode
   * writes nothing until Save; this is the same panel `assignActivity` drives
   * in edit mode, so both this staged path and edit mode's immediate write go
   * through identical UI mechanics.
   */
  async createStudent(
    input: StudentInput,
    enrollment?: EnrollmentInput,
    activityOptionLabels: string[] = [],
  ): Promise<void> {
    const isPrivate = input.grade === 'Private';
    if (isPrivate && activityOptionLabels.length > 0) {
      throw new Error('A Private-grade student has no Extra-Curriculars step to stage activities on.');
    }

    await this.createButton.click();
    await this.fillStudentFields(input);
    await this.wizardModal.locator('#nextBtn').click();
    await this.wizardModal.locator('#nextBtn').click();
    await this.wizardModal.locator('#nextBtn').click();
    await this.enrollInCourse(enrollment);
    if (isPrivate) {
      await this.wizardModal.locator('#saveBtn').click();
      return;
    }
    await this.wizardModal.locator('#nextBtn').click();
    for (const optionLabel of activityOptionLabels) {
      await this.assignActivity(optionLabel);
    }
    await this.wizardModal.locator('#saveBtn').click();
  }

  /**
   * Opens the create wizard and fills in the Student step only, leaving the
   * caller on the Student step to drive the remaining tabs itself — for a
   * scenario that needs to assert something between two of them, where
   * `createStudent`'s single pass through to Save would not stop to look.
   */
  async startCreatingStudent(input: StudentInput): Promise<void> {
    await this.createButton.click();
    await this.fillStudentFields(input);
  }

  /** Advances the create wizard by one Next click. */
  async goToNextStep(): Promise<void> {
    await this.wizardModal.locator('#nextBtn').click();
  }

  /** Presses Save on the create wizard's final step (Extra-Curriculars). */
  async saveStudent(): Promise<void> {
    await this.wizardModal.locator('#saveBtn').click();
  }

  /**
   * Opens the Courses tab's enroll panel, fills it in and confirms. In create
   * mode this stages the enrollment; in edit mode it submits one.
   */
  async enrollInCourse(enrollment?: EnrollmentInput): Promise<void> {
    const step = this.wizardModal.locator('#coursesStep');
    await step.locator('#enrollBtn').click();

    const form = step.locator('#enrollmentForm');
    await this.selectOfferedOption(form.locator('#course'), enrollment?.courseLabel);
    await this.selectOfferedOption(form.locator('#teacher'), enrollment?.teacherName);
    if (enrollment?.instrumentLabel) {
      await form.locator('#instrument').selectOption({ label: enrollment.instrumentLabel });
    }
    if (enrollment?.stepLabel) {
      await form.locator('#step').selectOption({ label: enrollment.stepLabel });
    }
    if (enrollment?.enrolledDate) {
      await form.locator('#enrolledDate').fill(enrollment.enrolledDate);
    }
    await form.locator('#confirmBtn').click();

    // Waits for the panel's own list view to return (its Enroll button
    // reappears) before a caller moves on. In create mode this is the signal
    // that the confirm was staged; a caller that immediately clicks Next
    // (Courses → Extra-Curriculars, since #277) could otherwise race the
    // panel's own collapse under load.
    await expect(step.locator('#enrollBtn')).toBeVisible();
  }

  /** Chooses the named option, or the first real one when the caller does not care which. */
  private async selectOfferedOption(select: Locator, label?: string): Promise<void> {
    if (label) {
      await select.selectOption({ label });
      return;
    }
    await select.selectOption({ index: 1 });
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

  /** Opens the Edit wizard for `name` and switches to its Courses tab. */
  async openCoursesTab(name: string): Promise<void> {
    await this.row(name).locator('.students-table__btn--edit').click();
    await this.wizardModal.locator('#tabCourses').click();
  }

  enrollmentListRow(courseLabel: string): Locator {
    return this.wizardModal
      .locator('#coursesStep')
      .locator('#enrollmentList')
      .locator('tr')
      .filter({ hasText: courseLabel });
  }

  /**
   * Corrects an enrollment on its own table row. Clicking Edit swaps the
   * teacher, instrument and step cells for selects — the course and the enrolled
   * date stay read-only text — and its Edit/Withdraw buttons for Cancel/Save.
   */
  async editEnrollment(
    courseLabel: string,
    changes: { teacherName?: string; instrumentLabel?: string; stepLabel?: string },
  ): Promise<void> {
    const row = this.enrollmentListRow(courseLabel);
    await row.locator('.enrollment-list__btn--edit').click();

    // The course cell stays text, so the row is still found by its label.
    const selects = row.locator('select');
    if (changes.teacherName) await selects.nth(0).selectOption({ label: changes.teacherName });
    if (changes.instrumentLabel) await selects.nth(1).selectOption({ label: changes.instrumentLabel });
    if (changes.stepLabel) await selects.nth(2).selectOption({ label: changes.stepLabel });

    await row.locator('.enrollment-list__btn--save').click();
  }

  /**
   * Withdraws the student from the named course. Confirmation is offered only
   * while the student holds another enrollment; on their last one the tab states
   * the requirement instead, so callers testing that path pass `confirm: false`.
   */
  async withdrawEnrollment(courseLabel: string, confirm = true): Promise<void> {
    await this.enrollmentListRow(courseLabel).locator('.enrollment-list__btn--withdraw').click();
    if (confirm) {
      await this.withdrawEnrollmentModal.locator('#withdrawBtn').click();
    }
  }

  get withdrawEnrollmentModal(): Locator {
    return this.page.locator('#withdrawEnrollmentModal');
  }

  /** The Courses step's own message area, where the at-least-one-course requirement is stated. */
  coursesStepMessage(): Locator {
    return this.wizardModal.locator('#coursesStep').locator('#message');
  }

  /** Read-only courses summary for the currently-expanded row (same scoping rule as siblings). */
  visibleCoursesSummary(): Locator {
    return this.page.locator('pm-student-courses-summary:visible');
  }

  /**
   * Read-only extra-curriculars summary for the currently-expanded row (same
   * scoping rule as siblings). Absent entirely for a Private-grade student
   * (#278's addendum) — it is never rendered for them, not merely empty.
   */
  visibleExtraCurricularsSummary(): Locator {
    return this.page.locator('pm-student-extra-curriculars-summary:visible');
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

  /**
   * Editing happens inline on the guardian's own table row — the shared
   * #guardianForm panel is Add-only. Clicking Edit swaps the row's cells for
   * inputs and its Edit/Delete buttons for Cancel/Save.
   */
  async editGuardian(currentName: string, changes: Partial<GuardianInput>): Promise<void> {
    await this.guardianListRow(currentName).locator('.guardian-list__btn--edit').click();

    // The row can no longer be found by name: its cells are now inputs, so the
    // name lives in a value rather than in text content. Only one row edits at
    // a time (every other row's Edit is disabled), so the row holding the
    // inline inputs is unambiguous.
    const editingRow = this.editingGuardianRow();
    await this.fillGuardianRowFields(editingRow, changes);
    await editingRow.locator('.guardian-list__btn--save').click();
  }

  /** The single guardian row currently in inline-edit mode. */
  editingGuardianRow(): Locator {
    return this.wizardModal
      .locator('#guardiansStep')
      .locator('#guardianList')
      .locator('tr')
      .filter({ has: this.page.locator('.guardian-list__edit-name') });
  }

  /**
   * The inline edit row builds its inputs dynamically without ids, so fields
   * are addressed by column position, matching pm-guardian-list's column order
   * (Name, Relationship, Cell, Email, Correspondence, Payment, Married).
   */
  private async fillGuardianRowFields(
    row: Locator,
    changes: Partial<GuardianInput>
  ): Promise<void> {
    const nameInputs = row.locator('.guardian-list__edit-name input');
    if (changes.firstName) await nameInputs.nth(0).fill(changes.firstName);
    if (changes.surname) await nameInputs.nth(1).fill(changes.surname);
    if (changes.relationshipLabel) {
      await row.locator('select').selectOption({ label: changes.relationshipLabel });
    }

    const textInputs = row.locator('td input.guardian-list__edit-input');
    if (changes.cell !== undefined) await textInputs.nth(2).fill(changes.cell);
    if (changes.email !== undefined) await textInputs.nth(3).fill(changes.email);

    const checkboxes = row.locator('.guardian-list__edit-checkbox');
    if (changes.receivesCorrespondence !== undefined) {
      await checkboxes.nth(0).setChecked(changes.receivesCorrespondence);
    }
    if (changes.responsibleForPayment !== undefined) {
      await checkboxes.nth(1).setChecked(changes.responsibleForPayment);
    }
    if (changes.married !== undefined) {
      await checkboxes.nth(2).setChecked(changes.married);
    }
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

  /**
   * The three flag cells of a guardian's row, in table order. Each renders
   * 'Yes' when set and '—' when not.
   */
  guardianFlagCells(name: string): {
    receivesCorrespondence: Locator;
    responsibleForPayment: Locator;
    married: Locator;
  } {
    const cells = this.guardianListRow(name).locator('td');
    return {
      receivesCorrespondence: cells.nth(4),
      responsibleForPayment: cells.nth(5),
      married: cells.nth(6),
    };
  }

  /** Opens the Add Guardian form without filling or submitting it. */
  async openAddGuardianForm(): Promise<void> {
    await this.wizardModal.locator('#guardiansStep').locator('#addBtn').click();
  }

  /** The Add form's relationship dropdown, populated from the seeded lookup. */
  guardianRelationshipSelect(): Locator {
    return this.wizardModal
      .locator('#guardiansStep')
      .locator('#guardianForm')
      .locator('#relationship');
  }

  /** Dismisses the Add Guardian form without creating a guardian. */
  async cancelGuardianForm(): Promise<void> {
    await this.wizardModal
      .locator('#guardiansStep')
      .locator('#guardianForm')
      .locator('#cancelBtn')
      .click();
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

  // --- Extra-Curriculars step -----------------------------------------------

  /** Opens the Edit wizard for `name` and switches to its Extra-Curriculars tab. */
  async openExtraCurricularsTab(name: string): Promise<void> {
    await this.row(name).locator('.students-table__btn--edit').click();
    await this.wizardModal.locator('#tabExtraCurriculars').click();
  }

  extraCurricularsStep(): Locator {
    return this.wizardModal.locator('#extraCurricularsStep');
  }

  /**
   * Opens the Add Activity panel. Waits first for any previous panel to have
   * fully collapsed (its 220ms CSS transition settled, not merely its class
   * toggled) — clicking `#addBtn` while that transition is still in flight
   * can leave Playwright's own actionability check treating the button as
   * unstable and silently retrying the click for real, which double-fires
   * the picker's own assignable-list request and can leave two responses
   * racing each other to populate the `<select>`.
   *
   * Also waits for *this* panel's own opening transition to finish before
   * returning. `#assignBtn` sits at the bottom of the panel, inside the
   * `max-height`-animated, `overflow: hidden` container — its own bounding
   * box never moves during the animation (only its ancestor's clip does), so
   * Playwright's stability check, which compares bounding boxes across
   * frames, reads it as already "stable" well before it is genuinely
   * paintable. Confirmed by a document-level click listener: a click fired
   * ~80ms into the 220ms transition landed for real on the panel's own
   * clipping wrapper, not the button — the assignment silently never
   * happened. Waiting out the full transition here removes the ambiguity for
   * every caller, rather than each one having to know why an immediate click
   * on `#assignBtn` can occasionally hit nothing.
   */
  async openAddActivityPanel(): Promise<void> {
    await expect(this.extraCurricularsStep().locator('#panel')).toBeHidden();
    await this.extraCurricularsStep().locator('#addBtn').click();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- no DOM signal exists for "the CSS transition has finished"; see the doc comment above.
    await this.page.waitForTimeout(300);
  }

  async cancelAddActivityPanel(): Promise<void> {
    await this.extraCurricularsStep().locator('#cancelBtn').click();
  }

  /**
   * The Add Activity panel's picker. Options read the activity's description
   * alone, per #278's R11 display correction — a student is assigned to an
   * activity, never to one of its practice times, so no slot is named.
   */
  activityPicker(): Locator {
    return this.extraCurricularsStep().locator('#activitySelect');
  }

  /** The panel's disabled, non-editable field showing the student's own phase. */
  activityPanelPhaseField(): Locator {
    return this.extraCurricularsStep().locator('#phaseField');
  }

  /**
   * Opens the Add Activity panel, chooses the activity by its picker option
   * label, and presses Assign. In edit mode this writes immediately; in
   * create mode it stages the activity in the wizard's memory. Always opens
   * the panel itself rather than checking whether one is already open — the
   * panel's collapse on a prior assign animates over 220ms, during which a
   * bounding-box check reads it as still open while it is in fact `inert`,
   * so re-detecting is less reliable than simply opening it every time.
   *
   * The picker's option list arrives from a request the panel opening
   * dispatches, so the desired option is awaited rather than assumed present
   * the instant the panel opens.
   */
  async assignActivity(optionLabel: string): Promise<void> {
    await this.openAddActivityPanel();
    await expect(this.activityPicker().locator('option', { hasText: optionLabel })).toHaveCount(1);
    await this.activityPicker().selectOption({ label: optionLabel });
    await this.extraCurricularsStep().locator('#assignBtn').click();
  }

  /** Presses Assign with nothing chosen in the picker. */
  async pressAssignWithNothingChosen(): Promise<void> {
    await this.extraCurricularsStep().locator('#assignBtn').click();
  }

  /** A row in the assigned-activity table, addressed by the activity's description. */
  assignedActivityRow(description: string): Locator {
    return this.extraCurricularsStep().locator('#rows').locator('tr').filter({ hasText: description });
  }

  async removeActivity(description: string): Promise<void> {
    await this.assignedActivityRow(description).getByRole('button', { name: 'Remove' }).click();
  }

  /** The "No extra-curricular activities assigned." line shown in place of rows. */
  noActivitiesMessage(): Locator {
    return this.extraCurricularsStep().locator('#empty');
  }

  /** The Extra-Curriculars step's own message area, where a refusal is shown. */
  extraCurricularsStepMessage(): Locator {
    return this.extraCurricularsStep().locator('#message');
  }
}
