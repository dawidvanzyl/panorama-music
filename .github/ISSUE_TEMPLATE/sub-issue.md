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

---

## Test Specifications

> **End-to-end behaviours, proven by Playwright and nothing else.** This section is QA's input
> contract: it is what scenario design decomposes and what the spec suite must prove. Every
> issue type carries it, so QA reads one section regardless of what kind of issue it is given.
>
> Derived at `plan-milestone` §3.7 from the epic's acceptance criteria and this story's
> interface contract — never authored by hand, and frozen once planning completes.
>
> IT codes are scoped to the issue that **owns the criterion**. For a story that is the epic
> (e.g. epic #45 → `45IT1`), so these codes carry the epic's number, not this sub-issue's.

- [ ] `[IT_CODE]` GIVEN … WHEN … THEN …

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

> **UC codes only.** Scoped to **this sub-issue's own** number (`{issue_number}UC{n}`, e.g.
> `48UC1` for issue #48), invented fresh per sub-issue, and proven by the unit-test runners —
> xUnit for backend, vitest service tests for frontend. Neither references a milestone.
>
> **IT codes never appear in this section.** They live under `## Test Specifications` and are
> proven by the Playwright suite alone. A story with no unit-testable behaviour of its own
> leaves both subsections empty; that is a valid state, not a gap, and its IT coverage still
> applies.

### Backend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### Frontend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

---

## Out of Scope

Explicitly what this story does **not** cover, to prevent scope creep during implementation.

- Deferred to: #issue or future milestone