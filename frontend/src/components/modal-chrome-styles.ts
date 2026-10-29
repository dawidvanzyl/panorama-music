import { buttonStateRules } from './button-states';

const modalChromeStyles = new CSSStyleSheet();
modalChromeStyles.replaceSync(`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }
    .modal__backdrop {
      position: fixed;
      inset: 0;
      background: var(--pm-scrim);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    :host([stacked]) .modal__backdrop {
      z-index: 120;
    }
    .modal__card {
      box-sizing: border-box;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      max-width: var(--pm-modal-width-sm);
      width: calc(100% - 32px);
      max-height: calc(100vh - 64px);
      overflow-y: auto;
      box-shadow: var(--pm-shadow-modal);
    }
    .modal__card--medium {
      max-width: var(--pm-modal-width-md);
    }
    .modal__card--large {
      max-width: var(--pm-modal-width-lg);
    }
    .modal__card--fill {
      max-width: none;
      width: calc(100% - var(--pm-sidebar-width) - 2 * var(--pm-content-padding));
    }
    .modal__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .modal__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      color: var(--pm-danger);
      font-size: 24px;
    }
    .modal__icon--reversible {
      color: var(--pm-accent);
    }
    .modal__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .modal__close {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      margin-left: auto;
      padding: 0;
      border: none;
      border-radius: var(--pm-radius-full);
      background: transparent;
      color: var(--pm-text-muted);
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 22px;
      line-height: 1;
    }
    .modal__close:hover:not(:disabled) {
      color: var(--pm-text);
      background: var(--pm-surface-2);
    }
    ${buttonStateRules('.modal__close', [])}
    .modal__body {
      font-size: 14px;
      line-height: 1.6;
      color: var(--pm-text-muted);
      margin-bottom: var(--pm-modal-body-gap);
    }
    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .modal__card > .modal__actions,
    .modal__card > .form-actions {
      position: sticky;
      bottom: 0;
      background: var(--pm-surface);
    }
    .modal__error {
      margin: 12px 0 var(--pm-modal-body-gap);
      font-size: 13px;
      font-weight: 400;
      color: var(--pm-danger-text);
    }
    .modal__error:empty {
      display: none;
    }
    .modal__btn {
      box-sizing: border-box;
      height: 40px;
      min-width: 96px;
      padding: 0 24px;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius-full);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
    }
    .modal__btn--primary {
      background: var(--pm-accent-solid);
      border-color: var(--pm-accent-solid);
      color: var(--pm-on-solid);
    }
    .modal__btn--primary:hover:not(:disabled) {
      background: var(--pm-accent-solid-hover);
      border-color: var(--pm-accent-solid-hover);
    }
    .modal__btn--destructive {
      background: var(--pm-danger-solid);
      border-color: var(--pm-danger-solid);
      color: var(--pm-on-solid);
    }
    .modal__btn--destructive:hover:not(:disabled) {
      background: var(--pm-danger-solid-hover);
      border-color: var(--pm-danger-solid-hover);
    }
    .modal__btn--cancel {
      background: transparent;
      border-color: var(--pm-border);
      color: var(--pm-text);
    }
    .modal__btn--cancel:hover:not(:disabled) {
      background: var(--pm-surface-2);
    }
    ${buttonStateRules('.modal__btn', ['.modal__btn--primary', '.modal__btn--destructive'])}
    @media print {
      .modal__btn,
      .modal__close,
      .modal__actions {
        display: none;
      }
    }
  `);

export { modalChromeStyles };
