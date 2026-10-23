import type { Locator } from '@playwright/test';

/** The container a table or list row keeps its action buttons in. */
export function rowActionsOf(row: Locator): Locator {
  return row.getByTestId('row-actions');
}

/** The labels of the row's action buttons, in document order. */
export async function actionNames(row: Locator): Promise<string[]> {
  return rowActionsOf(row)
    .locator('button')
    .evaluateAll((buttons) => buttons.map((button) => (button.textContent ?? '').trim()));
}

/** The label of the last control in the row that can take focus. */
export async function lastControlLabel(row: Locator): Promise<string> {
  return row.evaluate((element) => {
    const controls = Array.from(
      element.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    const last = controls[controls.length - 1];
    return (last?.textContent ?? '').trim();
  });
}

/** Whether the loading icon's left edge lies left of the left edge of the button's label text. */
export async function iconPrecedesLabel(button: Locator): Promise<boolean> {
  return button.evaluate((element) => {
    const icon = element.querySelector('[data-testid="button-loading-icon"]');
    const label = Array.from(element.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
    );
    if (!icon || !label) return false;
    const range = document.createRange();
    range.selectNodeContents(label);
    return icon.getBoundingClientRect().left < range.getBoundingClientRect().left;
  });
}
