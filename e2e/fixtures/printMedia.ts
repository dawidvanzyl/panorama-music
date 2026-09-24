import type { Locator, Page } from '@playwright/test';

/** A4 portrait, 1cm margins: 190mm ≈ 718 CSS px, per plan-qa's printable-width note. */
export const PRINTABLE_WIDTH_PX = 718;

const LIGHT_BACKGROUND_THRESHOLD = 0.7;
const NEAR_BLACK_THRESHOLD = 0.05;
const MUTED_TEXT_MAX = 0.2;

/** Sets the viewport to the printable width and switches to print media emulation. */
export async function switchToPrintMedia(page: Page, height = 1000): Promise<void> {
  await page.setViewportSize({ width: PRINTABLE_WIDTH_PX, height });
  await page.emulateMedia({ media: 'print' });
}

/** Restores screen media emulation, for a scenario that asserts screen-only behaviour afterwards. */
export async function switchToScreenMedia(page: Page): Promise<void> {
  await page.emulateMedia({ media: 'screen' });
}

/**
 * WCAG relative luminance of a CSS colour string (`rgb()`/`rgba()`, as
 * `getComputedStyle` always resolves to), composited over white when
 * translucent. Every function below that needs this, or the transparency and
 * shadow-crossing helpers beside it, declares its own copy inside the
 * `locator.evaluate` callback — the callback is serialised to source and runs
 * in the browser, with no access to this module's scope.
 */

/**
 * The element's own effective background colour is light per the plan's
 * measure. A transparent background defers to the nearest non-transparent
 * ancestor, walking up through shadow hosts — "a transparent background
 * counts as light only if every ancestor's background is light".
 */
export async function ownBackgroundIsLight(locator: Locator): Promise<boolean> {
  return locator.evaluate((el, threshold) => {
    let current: Element | null = el;
    while (current) {
      const bg = getComputedStyle(current).backgroundColor;
      if (!isTransparentInPage(bg)) return relativeLuminanceInPage(bg) >= threshold;
      current = parentAcrossShadow(current);
    }
    return true;

    function relativeLuminanceInPage(color: string): number {
      const match = color.match(/rgba?\(([^)]+)\)/);
      if (!match) return 1;
      const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
      const [r, g, b] = parts;
      const a = parts.length > 3 ? parts[3] : 1;
      const cr = r * a + 255 * (1 - a);
      const cg = g * a + 255 * (1 - a);
      const cb = b * a + 255 * (1 - a);
      const toLinear = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(cr) + 0.7152 * toLinear(cg) + 0.0722 * toLinear(cb);
    }
    function isTransparentInPage(color: string): boolean {
      const match = color.match(/rgba\(([^)]+)\)/);
      if (!match) return color === 'transparent';
      const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
      return parts.length > 3 && parts[3] === 0;
    }
    function parentAcrossShadow(node: Element): Element | null {
      if (node.parentElement) return node.parentElement;
      const root = node.getRootNode();
      return root instanceof ShadowRoot ? root.host : null;
    }
  }, LIGHT_BACKGROUND_THRESHOLD);
}

/** The element's own computed background colour is white (not merely light). */
export async function ownBackgroundIsWhite(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const match = bg.match(/rgba?\(([^)]+)\)/);
    if (!match) return false;
    const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
    const [r, g, b, a] = parts;
    return r >= 254 && g >= 254 && b >= 254 && (a === undefined || a >= 0.99);
  });
}

/** The element's own computed `color` is near-black per the plan's luminance measure. */
export async function ownTextIsNearBlack(locator: Locator): Promise<boolean> {
  return locator.evaluate((el, threshold) => {
    return luminance(getComputedStyle(el).color) <= threshold;

    function luminance(color: string): number {
      const match = color.match(/rgba?\(([^)]+)\)/);
      if (!match) return 1;
      const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
      const [r, g, b] = parts;
      const a = parts.length > 3 ? parts[3] : 1;
      const cr = r * a + 255 * (1 - a);
      const cg = g * a + 255 * (1 - a);
      const cb = b * a + 255 * (1 - a);
      const toLinear = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(cr) + 0.7152 * toLinear(cg) + 0.0722 * toLinear(cb);
    }
  }, NEAR_BLACK_THRESHOLD);
}

/** The element's own computed `color` is muted per the plan's luminance measure. */
export async function ownTextIsMuted(locator: Locator): Promise<boolean> {
  return locator.evaluate(
    (el, thresholds) => {
      const l = luminance(getComputedStyle(el).color);
      return l > thresholds.nearBlack && l <= thresholds.muted;

      function luminance(color: string): number {
        const match = color.match(/rgba?\(([^)]+)\)/);
        if (!match) return 1;
        const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
        const [r, g, b] = parts;
        const a = parts.length > 3 ? parts[3] : 1;
        const cr = r * a + 255 * (1 - a);
        const cg = g * a + 255 * (1 - a);
        const cb = b * a + 255 * (1 - a);
        const toLinear = (c: number): number => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(cr) + 0.7152 * toLinear(cg) + 0.0722 * toLinear(cb);
      }
    },
    { nearBlack: NEAR_BLACK_THRESHOLD, muted: MUTED_TEXT_MAX }
  );
}

/** The element's own computed background is light per the plan's measure, but not white. */
export async function ownBackgroundIsLightGrey(locator: Locator): Promise<boolean> {
  const [light, white] = await Promise.all([
    ownBackgroundIsLight(locator),
    ownBackgroundIsWhite(locator),
  ]);
  return light && !white;
}

/** The element's computed print colour adjustment is `exact` (standard or `-webkit-` prefixed). */
export async function computesPrintColorAdjustExact(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el) as CSSStyleDeclaration & {
      printColorAdjust?: string;
      webkitPrintColorAdjust?: string;
    };
    return style.printColorAdjust === 'exact' || style.webkitPrintColorAdjust === 'exact';
  });
}

export interface AncestorMetric {
  tagName: string;
  overflow: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * The chain of ancestor elements from `locator`'s element up to `<html>`,
 * crossing shadow-root boundaries via `getRootNode().host` the way a regular
 * `parentElement` walk cannot. Used by the width- and height-overflow checks,
 * which must inspect every ancestor "up through every shadow host to the
 * document" per the plan.
 */
export async function ancestorChain(locator: Locator): Promise<AncestorMetric[]> {
  return locator.evaluate((el) => {
    const chain: AncestorMetric[] = [];
    let current: Element | null = el;
    while (current) {
      const style = getComputedStyle(current);
      chain.push({
        tagName: current.tagName,
        overflow: style.overflow,
        scrollWidth: current.scrollWidth,
        clientWidth: current.clientWidth,
        scrollHeight: current.scrollHeight,
        clientHeight: current.clientHeight,
      });
      current = parentAcrossShadow(current);
    }
    return chain;

    function parentAcrossShadow(node: Element): Element | null {
      if (node.parentElement) return node.parentElement;
      const root = node.getRootNode();
      return root instanceof ShadowRoot ? root.host : null;
    }
  });
}

/** No ancestor in the chain (crossing shadow hosts) has horizontal overflow: scrollWidth ≤ clientWidth + 1. */
export function chainHasNoHorizontalOverflow(chain: AncestorMetric[]): boolean {
  return chain.every((a) => a.scrollWidth <= a.clientWidth + 1);
}

/**
 * No ancestor in the chain clips its content: either its computed `overflow`
 * is `visible`, or its scroll height doesn't exceed its client height.
 */
export function chainHasNoClippingAncestor(chain: AncestorMetric[]): boolean {
  return chain.every((a) => a.overflow === 'visible' || a.scrollHeight <= a.clientHeight + 1);
}

/** The document has no horizontal scroll: `documentElement.scrollWidth ≤ clientWidth + 1`. */
export async function documentHasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const html = document.documentElement;
    return html.scrollWidth <= html.clientWidth + 1;
  });
}

/** A locator's own content isn't clipped: `scrollWidth ≤ clientWidth + 1`. */
export async function isNotClipped(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
}

/**
 * The element's own box is taller than a single line of its text, i.e. it
 * wrapped rather than overflowed. `line-height: normal` is approximated as
 * 1.2× the font size, the usual UA default.
 */
export async function isTallerThanOneLine(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight =
      style.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(style.lineHeight);
    return el.clientHeight > lineHeight * 1.4;
  });
}

/**
 * The bottom edge of `locator`'s element, measured against the whole
 * document (its scroll position plus its viewport-relative rect), lies
 * within the document's total scroll height.
 */
export async function bottomEdgeWithinDocumentScrollHeight(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const bottom = rect.bottom + window.scrollY;
    return bottom <= document.documentElement.scrollHeight + 1;
  });
}
