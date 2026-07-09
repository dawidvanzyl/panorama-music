import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export interface ActivityLogFilters {
  actor?: string;
  eventType?: string;
  from?: string;
  to?: string;
}

export class ActivityLogPage extends BasePage {
  readonly heading: Locator;
  readonly actorInput: Locator;
  readonly eventTypeSelect: Locator;
  readonly fromInput: Locator;
  readonly toInput: Locator;
  readonly applyButton: Locator;
  readonly clearButton: Locator;
  readonly rows: Locator;
  readonly emptyState: Locator;
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly footerLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Activity Log' });
    this.actorInput = page.locator('#actor');
    this.eventTypeSelect = page.locator('#eventType');
    this.fromInput = page.locator('#from');
    this.toInput = page.locator('#to');
    this.applyButton = page.locator('#applyBtn');
    this.clearButton = page.locator('#clearBtn');
    this.rows = page.locator('table tbody tr');
    this.emptyState = page.locator('#empty');
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.prevButton = page.getByRole('button', { name: 'Previous' });
    this.footerLabel = page.locator('#footerLabel');
  }

  async gotoActivityLog(): Promise<void> {
    await this.goto('/#/admin/activity-log');
  }

  rowByText(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  async applyFilters(filters: ActivityLogFilters): Promise<void> {
    if (filters.actor) await this.actorInput.fill(filters.actor);
    if (filters.eventType) await this.eventTypeSelect.selectOption(filters.eventType);
    if (filters.from) await this.fromInput.fill(filters.from);
    if (filters.to) await this.toInput.fill(filters.to);
    await this.applyButton.click();
  }
}
