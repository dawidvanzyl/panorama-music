---
name: Sub-Issue
about: Story-level requirement brief for agent implementation
title: '[Feature] Short descriptive title'
labels: 'type: feature'
assignees: dawidvanzyl
---

> **Bug reports use this same template** — swap the title prefix to `[Bug]` and the label to
> `type: bug`. Everything else is unchanged.

## Overview

One paragraph. What this story delivers from a **user or system value perspective**, and why
it exists at this point in the milestone sequence.

---

## Epic Reference

- Epic: #issue-number
- Work Areas:
  - [ ] Exact checkbox text copied from epic

---

## Test Specifications

> QA's input contract: the end-to-end behaviours the Playwright suite must prove, decomposed
> by scenario design. `plan-milestone` derives these from the epic's acceptance criteria and
> this story's interface contract, and freezes them; never author them by hand. IT codes carry
> the **owning epic's** issue number (e.g. epic #45 → `45IT1`), not this sub-issue's.

- [ ] `[IT_CODE]` GIVEN … WHEN … THEN …

---

## Context & Constraints

> What the agent needs before writing a line: prior decisions, established patterns, things
> that must not change.

- **Existing patterns to follow:** e.g. all service classes use X pattern; auth via Y middleware
- **Known constraints:** e.g. must stay backwards-compatible with the existing endpoint contract
- **Related issues:** Depends on #issue / Supersedes decision from #issue
- **Design reference:** for frontend stories, the mockup(s) this screen is built to, and a
  line on what each shows. The source doesn't matter — whatever tool produced it — only that
  the design exists and is cited. It is authoritative: where it and this brief disagree, the
  mockup governs and the difference is in scope. Omit for stories with no UI.

---

## Functional Requirements

What this story must do, as observable behaviours — not file names or function signatures.

- Users must be able to…
- The system must…
- When X occurs, Y must happen…

---

## Domain & Data

> The entities and relationships, not the schema — the agent derives the schema from these.

**Entities touched:**
- `EntityName` — what it represents; fields relevant to this story (e.g. `status`, `ownerId`)
- `OtherEntity` — relationship to the above

**Business rules:**
- e.g. A `Project` may only transition to `active` if it has at least one assigned `Member`
- e.g. `archivedAt` must be set when status becomes `archived`

---

## API / Interface Contract

> The interface at the boundary level — what crosses the wire or the component boundary, with
> no implementation detail.

**Endpoints / Actions:**
- `POST /resource` — creates X; requires Y; returns Z
- `GET /resource/:id` — returns X; 404 if not found

**Events / Side-effects** (if applicable):
- Emits `resource.created` with payload `{ id, ownerId }`

**UI entry points** (if applicable):
- Accessible from: [screen/route]; triggered by: [user action]; visible to: [role/condition]

---

## Page Architecture
> `layer: frontend` only; omit otherwise. Built to the **Design reference** cited above.

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

> **UC codes only** — this sub-issue's own number (`{issue_number}UC{n}`, e.g. `48UC1`),
> invented fresh, proven by the unit runners (xUnit for backend, vitest service tests for
> frontend). IT codes never appear here; they live under `## Test Specifications`. Empty
> subsections are valid for a story with no unit-testable behaviour of its own — its IT
> coverage still applies.

### Backend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### Frontend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

---

## Out of Scope

Explicitly what this story does **not** cover, to prevent scope creep during implementation.

- Deferred to: #issue or future milestone
