import { buttonStateRules } from './button-states';

const formButtonStyles = new CSSStyleSheet();
formButtonStyles.replaceSync(`
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .form-btn {
      box-sizing: border-box;
      height: 44px;
      min-width: 96px;
      padding: 0 24px;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
    }
    .form-btn--primary {
      background: var(--pm-accent-solid);
      border-color: var(--pm-accent-solid);
      color: var(--pm-on-solid);
    }
    .form-btn--primary:hover:not(:disabled) {
      background: var(--pm-accent-solid-hover);
      border-color: var(--pm-accent-solid-hover);
    }
    .form-btn--secondary {
      background: transparent;
      border-color: var(--pm-border);
      color: var(--pm-text);
    }
    .form-btn--secondary:hover:not(:disabled) {
      background: var(--pm-surface-2);
    }
    .form-btn--warning {
      border-color: var(--pm-warning);
      color: var(--pm-warning);
    }
    .form-btn--warning:hover:not(:disabled) {
      background: var(--pm-warning-soft);
    }
    ${buttonStateRules('.form-btn', ['.form-btn--primary'])}
    @media print {
      .form-btn,
      .form-actions {
        display: none;
      }
    }
  `);

export { formButtonStyles };
