import type { Locator } from '@playwright/test';

/**
 * The action rows of the student wizard: the shared footer and the two
 * step-level rows shown in edit mode. Both host pages hold the same wizard, so
 * both page objects hand their `#wizardModal` to this class.
 *
 * Footer buttons are addressed through the footer, because nested forms inside
 * the steps carry their own `#cancelBtn`.
 */
export class WizardActionRows {
  readonly footer: Locator;
  readonly cancel: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly confirm: Locator;
  readonly studentStepRow: Locator;
  readonly waitingListStepRow: Locator;

  constructor(private readonly wizardModal: Locator) {
    this.footer = wizardModal.getByTestId('wizard-footer');
    this.cancel = this.footer.locator('#cancelBtn');
    this.previous = this.footer.locator('#previousBtn');
    this.next = this.footer.locator('#nextBtn');
    this.confirm = this.footer.locator('#saveBtn');
    this.studentStepRow = wizardModal.locator('#studentStepActions');
    this.waitingListStepRow = wizardModal.locator('#waitingListStepActions');
  }

  /** The footer's shown buttons, in document order. */
  footerButtons(): Locator {
    return this.footer.getByRole('button');
  }

  /** Every shown button in the wizard, wherever it sits. */
  anyButton(name: string): Locator {
    return this.wizardModal.getByRole('button', { name, exact: true });
  }

  /** The loading icon inside the footer confirm action. */
  confirmLoadingIcon(): Locator {
    return this.confirm.getByTestId('button-loading-icon');
  }

  /** The active wizard tab. */
  activeTab(): Locator {
    return this.wizardModal.locator('.wizard__tab--active');
  }

  /** Where the loading icon and the label text of the confirm action start, measured in the browser. */
  async confirmIconAndLabelLeftEdges(label: string): Promise<{ icon: number; label: number }> {
    return this.confirm.evaluate((button, text) => {
      const icon = button.querySelector('[data-testid="button-loading-icon"]');
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      let labelLeft = Number.NaN;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim() === text) {
          const range = document.createRange();
          range.selectNodeContents(node);
          labelLeft = range.getBoundingClientRect().left;
          break;
        }
      }
      return { icon: icon ? icon.getBoundingClientRect().left : Number.NaN, label: labelLeft };
    }, label);
  }
}
