import { describe, it, expect, afterEach } from 'vitest';
import { PmReportChecklistDropdown } from '../pm-report-checklist-dropdown';
import type { ReportFieldOption } from '../../models/report';

const gradeOptions: ReportFieldOption[] = [
  { value: 'Grade4', label: 'Grade 4' },
  { value: 'Grade5', label: 'Grade 5' },
];

/**
 * A minimal stand-in for the real nesting (dropdown -> filter-row ->
 * filters-panel -> builder-page), each level attaching its own shadow root.
 * One extra shadow boundary between the dropdown and `document` is enough to
 * reproduce the retargeting #326 depends on — `event.target` seen by a
 * `document` listener collapses to the OUTERMOST shadow host in the chain,
 * never to the dropdown itself.
 */
class PmTestOuterHost extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
}
if (!customElements.get('pm-test-outer-host')) {
  customElements.define('pm-test-outer-host', PmTestOuterHost);
}

describe(
  'pm-report-checklist-dropdown — outside-click detection under nested shadow DOM',
  { tags: ['317UC-bug4'] },
  () => {
    let outer: PmTestOuterHost;
    let dropdown: PmReportChecklistDropdown;

    afterEach(() => {
      document.body.removeChild(outer);
    });

    it('a tick inside the dropdown does not close the panel, even nested under another shadow host (#326)', () => {
      outer = document.createElement('pm-test-outer-host') as PmTestOuterHost;
      document.body.appendChild(outer);

      dropdown = new PmReportChecklistDropdown();
      outer.shadowRoot!.appendChild(dropdown);
      dropdown.options = gradeOptions;
      dropdown.values = [];

      const panel = dropdown.shadowRoot!.getElementById('panel')!;
      panel.classList.add('checklist__panel--open');

      const checkbox = dropdown.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      // A real, composed, bubbling click — exactly what a Teacher's click
      // dispatches — so it actually crosses both shadow boundaries and
      // exercises the same document-level listener the bug report describes.
      checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(panel.classList.contains('checklist__panel--open')).toBe(true);
    });

    it('a real click outside the dropdown still closes the panel', () => {
      outer = document.createElement('pm-test-outer-host') as PmTestOuterHost;
      document.body.appendChild(outer);

      dropdown = new PmReportChecklistDropdown();
      outer.shadowRoot!.appendChild(dropdown);
      dropdown.options = gradeOptions;
      dropdown.values = [];

      const panel = dropdown.shadowRoot!.getElementById('panel')!;
      panel.classList.add('checklist__panel--open');

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(panel.classList.contains('checklist__panel--open')).toBe(false);
    });
  },
);
