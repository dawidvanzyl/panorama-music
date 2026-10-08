import type { Locator, Page } from '@playwright/test';

export type PrintSectionName = 'siblings' | 'guardians' | 'courses' | 'extraCurriculars';

export interface PrintedGuardian {
  heading: string;
  contacts: string[];
  flags: string | null;
  lineCount: number;
  text: string;
}

export interface PrintedCourse {
  heading: string;
  assignment: string;
  enrolled: string;
}

const BLOCK_LINES = [
  '#printedOn',
  '#studentName',
  '.print-record__value',
  '#siblings',
  '#extraCurriculars',
  '.print-record__entry-heading',
  '.print-record__contact',
  '.print-record__flags',
  '.print-record__assignment',
  '.print-record__enrolled',
  '.print-record__empty',
].join(', ');

/** The print-only record of the Students screen, reached through its hooked lines. */
export class StudentPrintRecordPage {
  readonly record: Locator;
  readonly printedOn: Locator;
  readonly studentName: Locator;
  readonly details: Locator;
  readonly siblingsLine: Locator;
  readonly guardians: Locator;
  readonly courses: Locator;
  readonly extraCurricularsLine: Locator;

  constructor(page: Page) {
    this.record = page.locator('pm-students-page #printRecord');
    this.printedOn = this.record.locator('#printedOn');
    this.studentName = this.record.locator('#studentName');
    this.details = this.record.locator('#details');
    this.siblingsLine = this.record.locator('#siblings');
    this.guardians = this.record.locator('#guardians');
    this.courses = this.record.locator('#courses');
    this.extraCurricularsLine = this.record.locator('#extraCurriculars');
  }

  section(name: PrintSectionName): Locator {
    return this.record.locator(`section#${name}Section`);
  }

  sectionHeading(name: PrintSectionName): Locator {
    return this.section(name).locator('.print-record__heading');
  }

  emptyState(name: PrintSectionName): Locator {
    return this.section(name).locator('.print-record__empty');
  }

  guardianEntries(): Locator {
    return this.guardians.locator('.print-record__entry');
  }

  courseEntries(): Locator {
    return this.courses.locator('.print-record__entry');
  }

  /** Every block line element of the record, the only elements the geometry checks apply to. */
  blockLines(): Locator {
    return this.record.locator(BLOCK_LINES);
  }

  /** The details as labelled pairs, in the order they are laid out. */
  async detailPairs(): Promise<{ label: string; value: string }[]> {
    return this.record.locator('.print-record__detail').evaluateAll((details) =>
      details.map((detail) => ({
        label: detail.querySelector('.print-record__label')?.textContent ?? '',
        value: detail.querySelector('.print-record__value')?.textContent ?? '',
      })),
    );
  }

  async printedGuardians(): Promise<PrintedGuardian[]> {
    return this.guardianEntries().evaluateAll((entries) =>
      entries.map((entry) => ({
        heading: entry.querySelector('.print-record__entry-heading')?.textContent ?? '',
        contacts: Array.from(entry.querySelectorAll('.print-record__contact')).map(
          (contact) => contact.textContent ?? '',
        ),
        flags: entry.querySelector('.print-record__flags')?.textContent ?? null,
        lineCount: entry.querySelectorAll(
          '.print-record__entry-heading, .print-record__contact, .print-record__flags',
        ).length,
        text: entry.textContent ?? '',
      })),
    );
  }

  async printedCourses(): Promise<PrintedCourse[]> {
    return this.courseEntries().evaluateAll((entries) =>
      entries.map((entry) => ({
        heading: entry.querySelector('.print-record__entry-heading')?.textContent ?? '',
        assignment: entry.querySelector('.print-record__assignment')?.textContent ?? '',
        enrolled: entry.querySelector('.print-record__enrolled')?.textContent ?? '',
      })),
    );
  }
}
