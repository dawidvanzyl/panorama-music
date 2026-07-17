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
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal__card {
      background: var(--pm-surface, #1a1d27);
      border: 1px solid var(--pm-border, #2e3250);
      border-radius: var(--pm-radius, 10px);
      padding: 24px;
      max-width: 420px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    .modal__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .modal__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      color: var(--pm-danger, #e05252);
      font-size: 24px;
    }
    .modal__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-danger, #e05252);
    }
    .modal__body {
      font-size: 14px;
      line-height: 1.6;
      color: var(--pm-text-muted, #9194a6);
      margin-bottom: var(--pm-modal-body-gap, 16px);
    }
    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .modal__btn {
      padding: 10px 24px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .modal__btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .modal__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border, #2e3250);
      color: var(--pm-text-muted, #9194a6);
    }
    .modal__btn--cancel:hover:not(:disabled) {
      background: var(--pm-surface-2, #22263a);
    }
  `);

export { modalChromeStyles };
