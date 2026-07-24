import { describe, it, expect } from 'vitest';
import { PmStudentWizardModal } from '../pm-student-wizard-modal';

function localStyleSheetFor(shadowRoot: ShadowRoot): CSSStyleSheet {
  const [, localSheet] = shadowRoot.adoptedStyleSheets;
  return localSheet;
}

function ruleFor(sheet: CSSStyleSheet, selector: string): CSSStyleRule {
  const rule = Array.from(sheet.cssRules).find((r) => (r as CSSStyleRule).selectorText === selector);
  if (!rule) throw new Error(`No rule found for selector ${selector}`);
  return rule as CSSStyleRule;
}

describe('pm-student-wizard-modal fixed-size layout', { tags: ['207UC1', '207UC2'] }, () => {
  it('gives the modal card an unconditional fixed height independent of the active step', () => {
    const modal = new PmStudentWizardModal();
    const localSheet = localStyleSheetFor(modal.shadowRoot!);

    const cardRule = ruleFor(localSheet, '.modal__card');
    expect(cardRule.style.getPropertyValue('height')).toBe('600px');
    expect(cardRule.style.getPropertyValue('display')).toBe('flex');
    expect(cardRule.style.getPropertyValue('flex-direction')).toBe('column');

    const selectors = Array.from(localSheet.cssRules).map((r) => (r as CSSStyleRule).selectorText);
    expect(selectors.filter((s) => s.includes('.modal__card'))).toEqual(['.modal__card']);
  });

  it('lets only the active step flex to fill the fixed card while header/tabs/actions stay pinned', () => {
    const modal = new PmStudentWizardModal();
    const localSheet = localStyleSheetFor(modal.shadowRoot!);

    const visibleStepRule = ruleFor(localSheet, '.wizard__step--visible');
    expect(visibleStepRule.style.getPropertyValue('flex')).toBe('1 1 0%');
    expect(visibleStepRule.style.getPropertyValue('min-height')).toBe('0px');

    const headerRule = ruleFor(localSheet, '.modal__header');
    expect(headerRule.style.getPropertyValue('flex-shrink')).toBe('0');

    const tabsRule = ruleFor(localSheet, '.wizard__tabs');
    expect(tabsRule.style.getPropertyValue('flex-shrink')).toBe('0');

    const actionsRule = ruleFor(localSheet, '.wizard__actions');
    expect(actionsRule.style.getPropertyValue('flex-shrink')).toBe('0');
  });
});
