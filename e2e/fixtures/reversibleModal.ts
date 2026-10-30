import type { Locator } from '@playwright/test';
import { expect } from './base';
import { headerIcon, visibleBody } from './destructiveModal';

export interface ReversibleWording {
  title: string;
  /** The whole visible body paragraph, whitespace collapsed. */
  body: string;
  /** The accessible name of the one confirm button. */
  confirm: 'Unlink' | 'Deactivate';
}

type ColourProperty = 'color' | 'background-color';

/** The computed colour a token resolves to inside the same shadow root as the element. */
async function resolveToken(element: Locator, property: ColourProperty, token: string): Promise<string> {
  return element.evaluate(
    (node, [prop, name]) => {
      const probe = document.createElement('span');
      probe.style.setProperty(prop, `var(${name})`);
      node.parentElement!.appendChild(probe);
      const value = getComputedStyle(probe).getPropertyValue(prop);
      probe.remove();
      return value;
    },
    [property, token] as const,
  );
}

async function computed(element: Locator, property: ColourProperty): Promise<string> {
  return element.evaluate((node, prop) => getComputedStyle(node).getPropertyValue(prop), property);
}

/** The element's colour equals the accent token's value and differs from the danger token's. */
async function expectAccentNotDanger(
  element: Locator,
  property: ColourProperty,
  accent: string,
  danger: string,
): Promise<void> {
  const actual = await computed(element, property);
  const accentValue = await resolveToken(element, property, accent);
  const dangerValue = await resolveToken(element, property, danger);
  expect(actual, `${property} equals ${accent}`).toBe(accentValue);
  expect(actual, `${property} differs from ${danger}`).not.toBe(dangerValue);
}

/**
 * The shared reversible template: the info icon hidden from assistive
 * technology and drawn in the accent colour, a heading title, one body
 * paragraph without "cannot be undone", and one primary confirm button named
 * by its verb alone, after Cancel.
 */
export async function expectReversibleTemplate(modal: Locator, wording: ReversibleWording): Promise<void> {
  await expect(modal.locator('.modal__card')).toBeVisible();

  const icon = headerIcon(modal);
  await expect(icon).toHaveText('info');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expectAccentNotDanger(icon, 'color', '--pm-accent', '--pm-danger');

  await expect(modal.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(modal.getByRole('heading', { level: 2 })).toHaveText(wording.title);

  await expect(visibleBody(modal)).toHaveCount(1);
  await expect(visibleBody(modal)).toHaveText(wording.body);
  await expect(visibleBody(modal)).not.toContainText('cannot be undone');
  await expect(visibleBody(modal)).not.toContainText(/^\s*Are you sure/);

  const confirm = modal.getByRole('button', { name: wording.confirm, exact: true });
  await expect(confirm).toHaveCount(1);
  await expect(confirm).toHaveClass(/modal__btn--primary/);
  await expect(confirm).not.toHaveClass(/modal__btn--destructive/);
  await expectAccentNotDanger(confirm, 'background-color', '--pm-accent-solid', '--pm-danger-solid');
  await expect(modal.getByTestId('modal-actions').getByRole('button')).toHaveText(['Cancel', wording.confirm]);
}
