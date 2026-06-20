---
name: Sub-Issue
about: Story-level requirement brief for agent implementation
title: '[M?] Short descriptive title'
labels: ''
assignees: dawidvanzyl
---

## Overview

One paragraph. What this story delivers from a **user or system value perspective**, and why it exists at this point in the milestone sequence.

---

## Epic Reference

- Milestone: [M? — Milestone Title](#issue-number)
- Work Areas:
  - [ ] Exact checkbox text copied from epic
- Acceptance Criteria Covered:
  - [ ] `[IT_CODE]` Exact checkbox text copied from epic (e.g. `M1IT1`)

---

## Context & Constraints

> What the agent needs to know before writing a single line — prior decisions, patterns already established, things that must not change.

- **Existing patterns to follow:** e.g. all service classes use X pattern; auth is handled via Y middleware
- **Known constraints:** e.g. must remain backwards-compatible with M1 endpoint contract
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

### Backend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### Frontend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

---

## Out of Scope

Explicitly what this story does **not** cover, to prevent scope creep during implementation.

- Deferred to: #issue or future milestone