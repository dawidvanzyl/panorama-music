import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export type OccurrenceLabel = 'During School' | 'After School';

export class WaitingListPage extends BasePage {
  readonly captureButton: Locator;
  readonly errorBanner: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.captureButton = page.locator('pm-waiting-list-page #captureBtn');
    this.errorBanner = page.locator('pm-waiting-list-page #error');
    this.emptyState = page.locator('pm-waiting-list-table #empty');
  }

  async gotoWaitingList(): Promise<void> {
    await this.goto('/#/waiting-list');
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
