# Frontend Coding Standards

TypeScript, Web Components, Vite, and architectural conventions for the Panorama Music frontend.

> Workflow, branching, commit and PR rules: `coding-standards.md`. Backend conventions:
> `coding-standards-backend.md`. Code style and formatting are governed by `.editorconfig` and
> Prettier; architectural/structural rules are enforced via `eslint.config.js` and the
> `pm-architecture` ESLint plugin (CI-gated). None of these are duplicated here.

---

# 1. Architectural Principles

The frontend follows a pragmatic Domain-Driven Design: features are self-contained and independently
evolvable, business logic does not leak into UI components, data fetching and caching are centralised
and consistent, and the folder structure reflects domain features rather than technical layers. It is
organised around **bounded contexts (features)**, not generic technical folders.

**Feature ownership.** Each feature owns its UI components, services (API interaction + caching),
models (feature-specific types), state (session/UI where applicable), and pages (route-level
components). A feature is self-contained and must not depend on the internal structure of another
feature.

**Shared layer.** A `shared/` layer exists for cross-feature concerns, strictly limited to reusable
infrastructure and UI primitives. It must not contain feature- or domain-specific logic.

---

# 2. Project Structure

A vanilla TypeScript SPA built with Vite using Web Components.

```text
src/
    features/
        authentication/
        songs/
        playlists/
    shared/
        components/
        services/
        state/
        utils/
    styles/
    main.ts
    index.html
```

---

# 3. Feature Structure

Each feature follows a consistent internal structure; include only the folders it needs:

```text
features/<feature-name>/
    components/
    pages/
    services/
    models/
    state/
```

If a feature grows beyond this, add folders by responsibility, following the same principles as the
shared layer — no catch-all folders, no ambiguous names.

**Isolation.** Features must not import internal modules from other features or access another
feature's state or models directly; they communicate via shared services or APIs only.

---

# 4. Web Component Architecture

**Naming.** Custom elements use a `pm-` prefix and kebab-case (`pm-song-card`, `pm-login-form`);
class names use PascalCase (`PmSongCard`, `PmLoginForm`); one component per file (`pm-song-card.ts`).

**Responsibilities.** Components render UI, handle user interactions, and emit events. They are not
responsible for API calls, caching, business logic, state persistence, or authentication logic.

**Boundaries.** Components stay small and composable, stateless where possible, and driven by inputs
and events. Large "god components" are prohibited.

---

# 5. Services and Data Access

Services are the **only layer allowed to interact with APIs**. They handle API communication, request
caching, request deduplication, and transformation of responses into feature models. They must not
manipulate the DOM, contain UI or presentation logic, or render components.

**Fetch policy.** Direct `fetch` inside components is prohibited — all API calls go through a feature
or shared service.

**Caching.** Services cache stable or reusable data where appropriate (song lists, reference data,
user profile data). Caching is consistent within a feature and transparent to components. Cache
invalidation is the responsibility of the service that owns the data and must occur in response to
mutations, not be left to callers.

---

# 6. State Management

State is explicitly owned by either a feature (feature state) or shared infrastructure
(global/session state). It must not be stored inside UI components, duplicated across features, or
managed through ad-hoc variables or globals.

**Authentication state** — current user, session tokens, login status — is centralised in shared
infrastructure and never duplicated across features.

---

# 7. Shared Layer Rules

**Allowed in `shared/`:** reusable UI components (design system), API base clients, HTTP utilities,
authentication primitives (non-feature workflows), generic utilities (formatting, parsing, helpers),
shared state primitives.

**Prohibited in `shared/`:** feature-specific logic, domain workflows (songs, playlists, etc.),
business rules, feature-owned services, UI tied to a specific bounded context.

If code carries domain meaning it does not belong in `shared/` — `shared/` is infrastructure, not an
application layer.

---

# 8. TypeScript Rules

- **Strictness:** `strict: true` is enabled, `any` is prohibited, use `unknown` with explicit
  narrowing.
- **Modelling:** prefer interfaces for object shapes; models are feature-owned unless truly shared.
  Frontend models are always distinct from backend contracts — mapping is mandatory, and duplicating
  backend shapes into feature models is expected and correct.
- **API contracts:** map API responses into feature models; components never depend directly on raw
  API responses.

---

# 9. CSS Conventions

- Component-scoped styles use Shadow DOM where applicable.
- Global styles are restricted to resets, design tokens, typography rules, and app-shell layout
  regions (e.g. `.pm-app-shell`, `.pm-shell`, `.pm-shell main`) — the fixed-chrome layout (nav bar,
  sidebar, footer, and the content region between them) is a single global structural concern with no
  per-component owner, so its sizing/spacing rules are scoped here rather than duplicated per page
  component.
- When Shadow DOM is not used, name with BEM style inside components (`song-card__title`,
  `song-card--active`).
- Avoid global style leakage, cross-component styling dependencies, and styling based on an unrelated
  feature's structure.

---

# 10. Testing

Three layers: **unit** and **component** tests with Vitest, **integration**/E2E tests with Playwright.

- **Unit** — services, state logic, utilities, pure functions; fast and isolated.
- **Component** — rendering behaviour, user interaction, event emission; tested without real API
  calls.
- **Integration** — feature workflows, service + component interaction, authentication flows, routing;
  validate user journeys, not implementation details.

---

# 11. Architectural Constraints

Prohibited unless explicitly justified: API calls inside components, business logic inside
components, large monolithic components, unmanaged global state, duplication of state across features,
direct cross-feature internal imports, and use of `any` in TypeScript.
