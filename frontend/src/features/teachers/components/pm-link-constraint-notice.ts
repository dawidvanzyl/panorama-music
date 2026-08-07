const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      margin-top: 16px;
    }
    :host([hidden]) {
      display: none;
    }
    .link-constraint-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(79, 124, 255, 0.08);
      border: 1px solid var(--pm-accent);
    }
    .link-constraint-notice__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 22px;
      color: var(--pm-accent);
    }
    .link-constraint-notice__title {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 700;
      color: var(--pm-text);
    }
    .link-constraint-notice__body {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="link-constraint-notice">
    <span class="link-constraint-notice__icon" aria-hidden="true">link</span>
    <div>
      <p class="link-constraint-notice__title">This teacher is linked to a login account</p>
      <p class="link-constraint-notice__body">
        The link cannot be changed — unlink first to make the account options available again. While this link exists
        the Teacher role cannot be removed from the account. Deleting the account unlinks the teacher; the teacher
        record survives.
      </p>
    </div>
  </div>
`;

/** Explains what a live account link does and does not allow. */
export class PmLinkConstraintNotice extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('pm-link-constraint-notice', PmLinkConstraintNotice);
