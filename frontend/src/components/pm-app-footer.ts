const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
      flex-shrink: 0;
    }
    footer {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
      padding: 0 24px;
      border-top: 1px solid var(--pm-border);
      background: var(--pm-bg);
    }
    p {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
      opacity: 0.6;
      line-height: 1.6;
      text-align: center;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <footer>
    <p>&copy; 2026 Panorama Primary School. All rights reserved.</p>
  </footer>
`;

export class PmAppFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('pm-app-footer', PmAppFooter);
