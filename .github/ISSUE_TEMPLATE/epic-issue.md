---
name: Epic
about: Milestone epic overview — decomposed into Feature/Bug sub-issues by plan-milestone
title: '[Backlog] Short descriptive title'
labels: 'epic: backlog'
assignees: dawidvanzyl
---

## Overview

One paragraph. What this milestone delivers and why it matters, at a level a stakeholder
(not just an implementer) can follow.

---

## Milestone

Assign this epic to a GitHub Milestone using the issue's native **Milestone** field (right
sidebar) — do not encode a milestone tag (e.g. `M1.1`) in this issue's title. All downstream
tooling (`plan-milestone`, `prepare-milestone-base`, `close-milestone`) derives the milestone
number/tag from the **assigned milestone's own title**, never from this issue's title text.

---

## Acceptance Criteria

Epic-level, testable outcomes for the whole milestone — verified end-to-end, not per sub-issue.
Each sub-issue's `## Epic Reference > Acceptance Criteria Covered` cites a subset of these
verbatim by code.

> Codes are scoped to **this epic's own issue number** (`{epic_number}IT{n}`), since it exists
> before any sub-issue does. If drafting this before the issue is created, use the placeholder
> `{EPIC}IT{n}` and replace `{EPIC}` with the real number once GitHub assigns it — before
> referencing these codes from any sub-issue.

- [ ] `[IT_CODE]` GIVEN … WHEN … THEN …

---

## Anticipated Work Areas

> Populated and maintained by `plan-milestone` inside the markers below as sub-issues are
> created. Do not hand-edit between the markers — inserts here are idempotent and append-only;
> existing entries are never reordered, unchecked, or removed.

<!-- AWA_START -->
<!-- AWA_END -->

---

## Out of Scope

Explicitly what this milestone does **not** cover, to prevent scope creep during decomposition.

- Deferred to: #issue or future milestone
