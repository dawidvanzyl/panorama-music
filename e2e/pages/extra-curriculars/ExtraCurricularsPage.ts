import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export type Phase = 'Junior' | 'Senior';

export interface PracticeSlot {
  /** The day's display text, as offered in the dropdown. */
  day: string;
  /** Twenty-four hour `HH:mm`, as a time input takes it. */
  startTime: string;
}

/** How one slot reads on a staged chip and inside the table's cell. */
export function slotText(slot: PracticeSlot): string {
  return `${slot.day} ${slot.startTime}`;
}

/** The separator the Practice Times cell joins an activity's slots with. */
export const SLOT_SEPARATOR = ' · ';

export function slotsText(...slots: PracticeSlot[]): string {
  return slots.map(slotText).join(SLOT_SEPARATOR);
}

export class ExtraCurricularsPage extends BasePage {
  readonly activityForm: Locator;
  readonly filterBar: Locator;
  readonly activityTable: Locator;
  readonly deleteModal: Locator;

  constructor(page: Page) {
    super(page);
    this.activityForm = page.locator('#form');
    this.filterBar = page.locator('#filterBar');
    this.activityTable = page.locator('#table');
    this.deleteModal = page.locator('#deleteModal');
  }

  async gotoExtraCurriculars(): Promise<void> {
    await this.goto('/#/extra-curriculars');
  }

  /**
   * Re-reads the catalogue from the server. Navigating to the same hash route
   * is a same-document change and leaves the rendered table exactly as it was;
   * only a reload proves what was actually persisted.
   */
  async reloadExtraCurriculars(): Promise<void> {
    await this.page.reload();
  }

  // --- the create form -----------------------------------------------------

  descriptionInput(): Locator {
    return this.activityForm.locator('#description');
  }

  phaseSelect(): Locator {
    return this.activityForm.locator('#phase');
  }

  async enterActivity(description: string, phase: Phase): Promise<void> {
    await this.descriptionInput().fill(description);
    await this.phaseSelect().selectOption({ label: phase });
  }

  async stageSlot(slot: PracticeSlot): Promise<void> {
    await this.activityForm.locator('#day').selectOption({ label: slot.day });
    await this.activityForm.locator('#startTime').fill(slot.startTime);
    await this.activityForm.locator('#addBtn').click();
  }

  async submit(): Promise<void> {
    await this.activityForm.locator('#createBtn').click();
  }

  async createActivity(description: string, phase: Phase, slots: PracticeSlot[]): Promise<void> {
    await this.enterActivity(description, phase);
    for (const slot of slots) {
      await this.stageSlot(slot);
    }
    await this.submit();
  }

  /** Every slot staged so far, in the order the form holds them. */
  chips(): Locator {
    return this.activityForm.locator('.ec-form__chip');
  }

  /** A staged slot is addressed by the day and time that make it unique. */
  chip(slot: PracticeSlot): Locator {
    return this.activityForm.locator(`.ec-form__chip[data-slot="${slotText(slot)}"]`);
  }

  async removeStagedSlot(slot: PracticeSlot): Promise<void> {
    await this.chip(slot).getByRole('button', { name: `Remove ${slotText(slot)}` }).click();
  }

  /** The "No practice times added." line shown while nothing is staged. */
  noSlotsMessage(): Locator {
    return this.activityForm.locator('#noSlots');
  }

  /** The form's own refusal banner — a bad slot, or a create the form declines to send. */
  formError(): Locator {
    return this.activityForm.locator('#error');
  }

  // --- the filter bar ------------------------------------------------------

  async filterByPhase(label: string): Promise<void> {
    await this.filterBar.locator('#phase').selectOption({ label });
  }

  async filterByDescription(value: string): Promise<void> {
    await this.filterBar.locator('#description').fill(value);
  }

  // --- the table -----------------------------------------------------------

  /** Rows are matched on their rendered display text, never on an enum member. */
  row(...cellTexts: string[]): Locator {
    return cellTexts.reduce<Locator>(
      (rows, text) => rows.filter({ hasText: text }),
      this.activityTable.locator('tbody tr'),
    );
  }

  practiceTimesCell(row: Locator): Locator {
    return row.locator('td.ec-table__practice-times');
  }

  /** The "No extra-curricular activities found." line shown in place of rows. */
  emptyMessage(): Locator {
    return this.activityTable.locator('#empty');
  }

  actionsHeader(): Locator {
    return this.activityTable.locator('#actionsHeader');
  }

  // --- the expandable row and its practice-times panel ----------------------

  /**
   * The activity's own identifier, read off its row. The description is free
   * text and the panel is a sibling row carrying no description of its own, so
   * the identifier is what anchors panel locators to the panel itself rather
   * than deriving them from `row(description)`.
   */
  async activityId(description: string): Promise<string> {
    const id = await this.row(description).getAttribute('data-extra-curricular-id');
    if (!id) throw new Error(`No activity row found for "${description}".`);
    return id;
  }

  /** The chevron that opens and closes a row's practice-times panel. */
  expander(description: string): Locator {
    return this.row(description).getByRole('button', {
      name: new RegExp(`^(Expand|Collapse) practice times for `),
    });
  }

  /** `'true'` while the row is expanded — the collapsed state is observable, not inferred. */
  async isRowExpanded(description: string): Promise<string | null> {
    return this.expander(description).getAttribute('data-expanded');
  }

  async toggleRow(description: string): Promise<void> {
    await this.expander(description).click();
  }

  /** The panel opened beneath one activity's row, addressed by that activity. */
  panel(activityId: string): Locator {
    return this.activityTable.locator(
      `tr[data-practice-times-panel-for="${activityId}"] pm-extra-curricular-practice-times`,
    );
  }

  panelHeading(activityId: string): Locator {
    return this.panel(activityId).locator('#title');
  }

  /** The panel's refusal banner — a duplicate slot, the last slot, or a server reason. */
  panelError(activityId: string): Locator {
    return this.panel(activityId).locator('#errorText');
  }

  panelErrorBanner(activityId: string): Locator {
    return this.panel(activityId).locator('#error');
  }

  panelSlotRows(activityId: string): Locator {
    return this.panel(activityId).locator('#slots tr');
  }

  /**
   * Every slot the panel lists, as `"{Day} {HH:mm}"`, in the order rendered.
   * The ordered sequence is the part of the criterion a naive implementation
   * gets wrong, so it is read as a list rather than probed slot by slot.
   */
  async panelSlots(activityId: string): Promise<string[]> {
    return this.panelSlotRows(activityId).evaluateAll((rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll('td');
        return `${cells[0]?.textContent ?? ''} ${cells[1]?.textContent ?? ''}`;
      }),
    );
  }

  /** The panel's own identifier for a slot — what its Remove sends to the endpoint. */
  async panelSlotId(activityId: string, slot: PracticeSlot): Promise<string> {
    const ids = await this.panelSlotRows(activityId).evaluateAll((rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll('td');
        const text = `${cells[0]?.textContent ?? ''} ${cells[1]?.textContent ?? ''}`;
        return [text, row.dataset.practiceTimeId ?? ''] as const;
      }),
    );
    const match = ids.find(([text]) => text === slotText(slot));
    if (!match) throw new Error(`Panel lists no ${slotText(slot)} slot.`);
    return match[1];
  }

  panelSlotRow(activityId: string, practiceTimeId: string): Locator {
    return this.panel(activityId).locator(`#slots tr[data-practice-time-id="${practiceTimeId}"]`);
  }

  panelDaySelect(activityId: string): Locator {
    return this.panel(activityId).locator('#day');
  }

  panelStartTimeInput(activityId: string): Locator {
    return this.panel(activityId).locator('#startTime');
  }

  /** Stages and submits one slot through the panel's add control. */
  async addSlotFromPanel(activityId: string, slot: PracticeSlot): Promise<void> {
    await this.panelDaySelect(activityId).selectOption({ label: slot.day });
    await this.panelStartTimeInput(activityId).fill(slot.startTime);
    await this.panel(activityId).locator('#addBtn').click();
  }

  async removeSlotFromPanel(activityId: string, slot: PracticeSlot): Promise<void> {
    const practiceTimeId = await this.panelSlotId(activityId, slot);
    await this.panelSlotRow(activityId, practiceTimeId).getByRole('button', { name: 'Remove' }).click();
  }

  // --- the row's Edit and Delete controls (#278) -----------------------------

  /**
   * The activity's own row, addressed by its identifier rather than its
   * displayed text. Editing swaps the description cell for an input and the
   * phase badge for a select, so once a row is in its editing state, neither
   * value is part of its rendered text any more and `row(description)` can no
   * longer find it — this is what the edit-state methods below use instead.
   */
  rowById(activityId: string): Locator {
    return this.activityTable.locator(`tbody tr[data-extra-curricular-id="${activityId}"]`);
  }

  /** Presses Edit on the row, putting its description and phase into an editable state. */
  async editRow(description: string): Promise<void> {
    await this.row(description).getByRole('button', { name: 'Edit', exact: true }).click();
  }

  /** The row's own description input, visible only while that row is being edited. */
  rowDescriptionInput(activityId: string): Locator {
    return this.rowById(activityId).locator('#descriptionInput');
  }

  /** The row's own phase select, visible only while that row is being edited. */
  rowPhaseSelect(activityId: string): Locator {
    return this.rowById(activityId).locator('#phaseSelect');
  }

  /** Fills the row's own edit inputs, addressed by the activity's identifier. */
  async fillRowEdit(activityId: string, changes: { description?: string; phase?: Phase }): Promise<void> {
    if (changes.description !== undefined) {
      await this.rowDescriptionInput(activityId).fill(changes.description);
    }
    if (changes.phase !== undefined) {
      await this.rowPhaseSelect(activityId).selectOption({ label: changes.phase });
    }
  }

  /** Presses Save on the row currently being edited, addressed by the activity's identifier. */
  async saveRowEdit(activityId: string): Promise<void> {
    await this.rowById(activityId).getByRole('button', { name: 'Save', exact: true }).click();
  }

  /** Presses Cancel on the row currently being edited, discarding the drafted values. */
  async cancelRowEdit(activityId: string): Promise<void> {
    await this.rowById(activityId).getByRole('button', { name: 'Cancel', exact: true }).click();
  }

  /** Presses Delete on the activity's row. */
  async clickDelete(description: string): Promise<void> {
    await this.row(description).getByRole('button', { name: 'Delete', exact: true }).click();
  }

  /** Confirms the Delete Activity modal, carrying out the deletion. */
  async confirmDelete(): Promise<void> {
    await this.deleteModal.locator('#deleteBtn').click();
  }

  /** Cancels the Delete Activity modal, leaving the activity untouched. */
  async cancelDeleteModal(): Promise<void> {
    await this.deleteModal.locator('#cancelBtn').click();
  }

  /** The modal's own naming of the activity and its practice-time count. */
  deleteModalName(): Locator {
    return this.deleteModal.locator('#modalName');
  }

  deleteModalCount(): Locator {
    return this.deleteModal.locator('#modalCount');
  }

  /**
   * The row-level banner reporting a refused save or delete, addressed by the
   * activity's own identifier — it sits in its own row, above the activity's,
   * so it is not part of `row(description)` itself.
   */
  rowBanner(activityId: string): Locator {
    return this.activityTable.locator(`tr.ec-table__error-row[data-error-for="${activityId}"]`);
  }
}
