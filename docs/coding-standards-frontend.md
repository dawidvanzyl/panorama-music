# Frontend Coding Standards

TypeScript, Web Components, Vite, and CSS conventions for the Panorama Music project.

> For shared Git/PR conventions see [coding-standards.md](coding-standards.md).
> For backend conventions see [coding-standards-backend.md](coding-standards-backend.md).

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Web Component Naming](#2-web-component-naming)
3. [TypeScript Rules](#3-typescript-rules)
4. [CSS](#4-css)

---

## 1. File Structure

The frontend is a vanilla TypeScript single-page application built with Vite, using native Web Components (no framework).

```
frontend/
  src/
    components/    ← Web Component definitions
    pages/         ← Page-level components / route views
    services/      ← API client modules
    styles/        ← Global CSS
    main.ts        ← Entry point; registers components, sets up routing
  index.html
  vite.config.ts
  tsconfig.json
```

---

## 2. Web Component Naming

- Custom element tag names use `kebab-case` with a `pm-` prefix: `pm-song-card`, `pm-nav-bar`.
- The corresponding class uses `PascalCase`: `PmSongCard`, `PmNavBar`.
- One component per file; file name matches the tag name: `pm-song-card.ts`.

```typescript
// components/pm-song-card.ts
export class PmSongCard extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `<div class="song-card">...</div>`;
    }
}

customElements.define('pm-song-card', PmSongCard);
```

---

## 3. TypeScript Rules

- `strict: true` must be enabled in `tsconfig.json`.
- No `any` — use `unknown` and narrow explicitly.
- Prefer interfaces over type aliases for object shapes.
- Use `async/await`; avoid raw `.then()` chains.
- API calls go through a service module in `src/services/`; components do not call `fetch` directly.

---

## 4. CSS

- Scoped styles are defined inside the component's shadow DOM where encapsulation is needed.
- Global resets and CSS custom properties (design tokens) live in `src/styles/global.css`.
- Use BEM naming for class names inside components: `song-card__title`, `song-card--featured`.
