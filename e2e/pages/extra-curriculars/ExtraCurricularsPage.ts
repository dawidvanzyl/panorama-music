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

  constructor(page: Page) {
    super(page);
    this.activityForm = page.locator('#form');
    this.filterBar = page.locator('#filterBar');
    this.activityTable = page.locator('#table');
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
}
