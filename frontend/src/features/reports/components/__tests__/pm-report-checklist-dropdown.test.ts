import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmReportChecklistDropdown } from '../pm-report-checklist-dropdown';
import type { ReportFieldOption } from '../../models/report';

const gradeOptions: ReportFieldOption[] = [
  { value: 'Grade4', label: 'Grade 4' },
  { value: 'Grade5', label: 'Grade 5' },
];

describe('pm-report-checklist-dropdown — renders after connecting', { tags: ['317UC16'] }, () => {
  let el: PmReportChecklistDropdown;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('lists every option as a checkbox when properties are set before the element is appended (#324)', () => {
    // The normal, idiomatic construction order used by pm-report-filter-row:
    // build the element, assign its properties, THEN append it. Regression
    // guard for #324 — the panel used to stay permanently empty because
    // connectedCallback() never re-rendered once panel/toggle became
    // available.
    el = new PmReportChecklistDropdown();
    el.options = gradeOptions;
    el.values = [];

    document.body.appendChild(el);

    const checkboxes = [...el.shadowRoot!.querySelectorAll('input[type="checkbox"]')];
    expect(checkboxes).toHaveLength(2);
  });

  it('ticking an option updates the closed control label', () => {
    el = new PmReportChecklistDropdown();
    el.options = gradeOptions;
    el.values = [];
    document.body.appendChild(el);

    const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const toggle = el.shadowRoot!.getElementById('toggle') as HTMLButtonElement;
    expect(toggle.textContent).toBe('Grade 4');
    expect(el.values).toEqual(['Grade4']);
  });
});

describe('pm-report-checklist-dropdown — properties set after connecting', () => {
  let el: PmReportChecklistDropdown;

  beforeEach(() => {
    el = new PmReportChecklistDropdown();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('also renders options when they are set after the element is already connected', () => {
    el.options = gradeOptions;
    el.values = ['Grade5'];

    const checkboxes = [...el.shadowRoot!.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes.filter((c) => c.checked)).toHaveLength(1);
  });
});
