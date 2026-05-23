export class AppRootComponent extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = '<h1>panorama-music</h1>';
  }
}

if (!customElements.get('app-root')) {
  customElements.define('app-root', AppRootComponent);
}
