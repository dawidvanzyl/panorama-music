import { expect, type Locator } from '@playwright/test';

/** The dialog inside a modal host, found by its exact accessible name. */
export function dialogTitled(host: Locator, title: string): Locator {
  return host.getByRole('dialog', { name: title, exact: true });
}

/** The dialog name and the visible heading must both read the title exactly. */
export async function expectTitled(host: Locator, title: string): Promise<void> {
  await expect(dialogTitled(host, title)).toHaveCount(1);
  await expect(host.locator('.modal__header h2.modal__title')).toHaveText(title);
}

export async function expectNoHeaderIcon(host: Locator): Promise<void> {
  await expect(host.locator('.modal__header .modal__icon')).toHaveCount(0);
}

/** Names of every button in the modal except the close control, in document order. */
export async function actionButtonNames(host: Locator): Promise<string[]> {
  const buttons = host.getByRole('button');
  const count = await buttons.count();
  const names: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    const label = ((await button.getAttribute('aria-label')) ?? (await button.innerText())).trim();
    if (label !== 'Close') names.push(label);
  }
  return names;
}

/** Cancel comes before the confirm, and the confirm is named exactly `confirm`. */
export async function expectCancelThenConfirm(host: Locator, confirm: string): Promise<void> {
  await expect(host.getByRole('button', { name: confirm, exact: true })).toHaveCount(1);
  const names = await actionButtonNames(host);
  expect(names.indexOf('Cancel')).toBeGreaterThanOrEqual(0);
  expect(names.indexOf(confirm)).toBeGreaterThan(names.indexOf('Cancel'));
}
