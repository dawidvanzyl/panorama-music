---
name: Sub-Issue
about: Story-level requirement brief for agent implementation
title: '[Feature] Short descriptive title'
labels: 'type: feature'
assignees: dawidvanzyl
---

> **Bug reports use this same template** — swap the title prefix to `[Bug]` and the label to
> `type: bug` instead of `[Feature]`/`type: feature`. Everything else below is unchanged.

## Overview

One paragraph. What this story delivers from a **user or system value perspective**, and why it exists at this point in the milestone sequence.

---

## Epic Reference

- Epic: #issue-number
- Work Areas:
  - [ ] Exact checkbox text copied from epic
- Acceptance Criteria Covered:
  - [ ] `[IT_CODE]` Exact checkbox text **and code** copied verbatim from the epic (e.g. epic
    #45 → `45IT1`) — IT codes are scoped to the **epic's** issue number, not this sub-issue's

---

## Context & Constraints

> What the agent needs to know before writing a single line — prior decisions, patterns already established, things that must not change.

- **Existing patterns to follow:** e.g. all service classes use X pattern; auth is handled via Y middleware
- **Known constraints:** e.g. must remain backwards-compatible with the existing endpoint contract
- **Related issues:** Depends on #issue / Supersedes decision from #issue

---

## Functional Requirements

What this story must do, written as observable behaviours — not file names or function signatures.

- Users must be able to…
- The system must…
- When X occurs, Y must happen…

---

## Domain & Data

> Describe the entities and relationships involved, not the schema. The agent derives the schema from this.

**Entities touched:**
- `EntityName` — what it represents; relevant fields for this story (e.g. `status`, `ownerId`)
- `OtherEntity` — relationship to above

**Business rules:**
- e.g. A `Project` may only transition to `active` if it has at least one assigned `Member`
- e.g. `archivedAt` must be set when status becomes `archived`

---

## API / Interface Contract

> Describe the intended interface at the boundary level. No implementation detail — just what crosses the wire or the component boundary.

**Endpoints / Actions:**
- `POST /resource` — creates X; requires Y; returns Z
- `GET /resource/:id` — returns X; 404 if not found

**Events / Side-effects** (if applicable):
- Emits `resource.created` with payload `{ id, ownerId }`

**UI entry points** (if applicable):
- Accessible from: [screen/route]
- Triggered by: [user action]
- Visible to: [role/condition]

---

## Page Architecture
> Only required for sub-issues with `layer: frontend`. Omit entirely otherwise.

**Screen description:** ...

**Component hierarchy:**
```mermaid
flowchart TD
```

**User interaction flow:**
```mermaid
sequenceDiagram
```

---

## Acceptance Criteria (G/W/T)

> UC codes are scoped to **this sub-issue's own** number (`{issue_number}UC{n}`, e.g. `48UC1`
> for issue #48) — invented fresh per sub-issue. IT codes below and under Epic Reference are
> scoped to the **epic's** number and copied verbatim from it. Neither references a milestone.

### Backend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### Frontend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### E2E

> Only for criteria that don't decompose into backend-only or frontend-only behaviour. Codes here are IT codes (not UC codes) — one IT code per spec file/`test.describe` block, repeated across every G/W/T line that spec covers — verified via the Playwright E2E suite instead of the unit-test runners.

- [ ] `[IT_CODE]` GIVEN … WHEN … THEN …

---

## Out of Scope

Explicitly what this story does **not** cover, to prevent scope creep during implementation.

- Deferred to: #issue or future milestone