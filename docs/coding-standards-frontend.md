# Frontend Coding Standards

TypeScript, Web Components, Vite, and architectural conventions for the Panorama Music frontend.

> For workflow, branching, commit, and pull request rules see `coding-standards.md`.
>
> For backend conventions see `coding-standards-backend.md`.
>
> Code style and formatting are governed by `.editorconfig` and `Prettier`, and must not be duplicated here.
>
> Architectural rules and structural enforcement are implemented and enforced via `eslint.config.js` and the `pm-architecture` ESLint plugin (CI-gated).

---

# 1. Architectural Principles

## DDD-Aware Frontend

The frontend is structured using a pragmatic Domain-Driven Design approach.

The goal is to ensure:

* Features are self-contained and independently evolvable
* Business logic does not leak into UI components
* Data fetching and caching are centralised and consistent
* UI structure reflects domain features rather than technical layers

The frontend is organised around **bounded contexts (features)** rather than generic technical folders.

---

## Feature Ownership

Each feature owns:

* UI components
* services (API interaction + caching)
* models (feature-specific types)
* state (session or UI state where applicable)
* pages (route-level components)

Features must be self-contained and must not depend on internal structure of other features.

---

## Shared Layer

A `shared/` layer exists for cross-feature concerns.

It is strictly limited to reusable infrastructure and UI primitives.

`shared/` must NOT contain feature-specific or domain-specific logic.

---

# 2. Project Structure

The frontend is a vanilla TypeScript SPA built with Vite using Web Components.

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

Each feature follows a consistent internal structure:

```text
features/<feature-name>/
    components/
    pages/
    services/
    models/
    state/
```

Not every folder is required for every feature.

Only include folders that are needed.

If a feature grows beyond this structure, introduce additional folders by responsibility. Follow the same principles as the shared layer — no catch-all folders, no ambiguous names.

---

## Feature Isolation Rules

Features must:

* avoid importing internal modules from other features
* communicate via shared services or APIs only
* not directly access another feature’s state or models

---

# 4. Web Component Architecture

## Naming Conventions

* Custom elements use `pm-` prefix and kebab-case:

  * `pm-song-card`
  * `pm-login-form`

* Class names use PascalCase:

  * `PmSongCard`
  * `PmLoginForm`

* One component per file:

  * `pm-song-card.ts`

---

## Component Responsibilities

Components are responsible for:

* rendering UI
* handling user interactions
* emitting events

Components are NOT responsible for:

* API calls
* caching
* business logic
* state persistence
* authentication logic

---

## Component Boundaries

Components must be:

* small and composable
* stateless where possible
* driven by inputs and events

Large “god components” are prohibited.

---

# 5. Services and Data Access

## Service Responsibilities

Services are the **only layer allowed to interact with APIs**.

Services are responsible for:

* API communication
* request caching
* request deduplication
* data transformation into feature models

Services must NOT:

* manipulate DOM
* contain UI logic
* directly render components
* contain presentation concerns

---

## Fetch Policy

Direct use of `fetch` inside components is prohibited.

All API calls must go through feature or shared services.

---

## Caching Rules

Services must implement caching for stable or reusable data where appropriate.

Examples:

* song lists
* reference data
* user profile data

Caching must be:

* consistent within a feature
* transparent to components
* Cache invalidation is the responsibility of the service that owns the data. Invalidation must occur in response to mutations, not be left to callers.

---

# 6. State Management

## State Ownership

State must be explicitly owned by either:

* a feature (feature state)
* shared infrastructure (global/session state)

---

## Authentication State

Authentication and session state must be centralised.

It must not be duplicated across features.

Authentication state includes:

* current user
* session tokens
* login status

---

## State Rules

State must NOT be:

* stored inside UI components
* duplicated across features
* managed through ad-hoc variables or globals

---

# 7. Shared Layer Rules

## Allowed in `shared/`

* reusable UI components (design system)
* API base clients
* HTTP utilities
* authentication primitives (non-feature workflows)
* generic utilities (formatting, parsing, helpers)
* shared state primitives

---

## Prohibited in `shared/`

* feature-specific logic
* domain workflows (songs, playlists, etc.)
* business rules
* feature-owned services
* UI tied to a specific bounded context

---

## Shared Layer Principle

If code contains domain meaning, it does not belong in `shared/`.

`shared/` is infrastructure, not an application layer.

---

# 8. TypeScript Rules

## Language Strictness

* `strict: true` must be enabled
* `any` is prohibited
* use `unknown` with explicit narrowing

---

## Modelling Rules

* Prefer interfaces for object shapes
* Models must be feature-owned unless truly shared
* Frontend models are always distinct from backend contracts. Mapping is mandatory; duplication of backend shapes into feature models is expected and correct.

---

## API Contracts

* API responses must be mapped into feature models
* Components must never depend directly on raw API responses

---

# 9. CSS Conventions

* Component-scoped styles must use Shadow DOM where applicable
* Global styles are restricted to:

  * resets
  * design tokens
  * typography rules

---

## Naming

* Use BEM-style naming inside components when Shadow DOM is not used:

  * `song-card__title`
  * `song-card--active`

---

## Styling Rules

* Avoid global style leakage
* Avoid cross-component styling dependencies
* Do not style based on unrelated feature structure

---

# 10. Testing Principles

## Test Strategy Overview

Frontend testing is divided into three layers:

* Unit Tests
* Component Tests
* Integration Tests

The following tools are used:

* Vitest for unit and component tests
* Playwright for integration and end-to-end tests

---

## Unit Tests

Unit tests cover:

* services
* state logic
* utilities
* pure functions

Unit tests must be fast and isolated.

---

## Component Tests

Component tests cover:

* rendering behaviour
* user interaction
* event emission

Components must be tested without real API calls.

---

## Integration Tests

Integration tests cover:

* feature workflows
* service + component interaction
* authentication flows
* routing behaviour

Integration tests validate user journeys, not implementation details.

---

# 11. Architectural Constraints

The following are prohibited unless explicitly justified:

* API calls inside components
* business logic inside components
* large monolithic components
* unmanaged global state
* duplication of state across features
* direct cross-feature internal imports
* use of `any` in TypeScript

---

# 12. Design Philosophy

The frontend is designed to:

* separate UI from business logic
* centralise data access and caching
* enforce feature ownership
* minimise coupling between features
* remain predictable as the codebase grows

The system prioritises maintainability and clarity over flexibility.
