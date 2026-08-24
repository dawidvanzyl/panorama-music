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

Epic-level, testable outcomes for the whole milestone — verified end-to-end, not per
sub-issue. Write them as **prose**, one numbered criterion per observable outcome.

**Do not write IT codes here.** They are derived during planning, at `plan-milestone` §3.7,
once decomposition has produced each sub-issue's API contract and Page Architecture. Codes
authored now would be guessing at granularity before the story seams or the interface exist,
which is what made them coarse and awkward to map.

What this section must be at authoring time is the **independent statement of scope** that
everything downstream is checked against. Decomposition reasons about these criteria, the UI
audit walks them, and §3.7's coverage gate requires every one of them to carry at least one
IT code. A criterion nothing covers is a decomposition gap made visible — which only works if
these were written before, and independently of, the plan.

Number them `AC1`, `AC2`, … The numbers are stable identifiers: `it-codes.json` maps every
derived code back to the criterion it serves, so criteria are never renumbered or reordered
once planning has begun.

> **Between the markers:** you author the criteria. `plan-milestone` inserts derived IT code
> lines beneath them and never edits, reorders, renumbers, or removes a criterion. This
> differs from `## Anticipated Work Areas` below, which is entirely tool-owned.

<!-- AC_START -->
**AC1.** A single observable outcome, stated as behaviour rather than implementation.

**AC2.** Another.
<!-- AC_END -->

<details>
<summary>What this section looks like after planning §3.7</summary>

Codes are scoped to **this epic's own issue number** (`{epic_number}IT{n}`), which exists
before any sub-issue does. Each is a checkbox nested under the criterion it proves, and is
ticked by `close-milestone` when its Playwright spec passes.

```markdown
<!-- AC_START -->
**AC1.** An admin can enrol a student in a course.
- [ ] `45IT1` GIVEN a course with capacity WHEN an admin enrols a student THEN the student is enrolled
- [ ] `45IT2` GIVEN a student already enrolled WHEN an admin enrols them again THEN it is rejected

**AC2.** An enrolled student appears on the course roster.
- [ ] `45IT3` GIVEN an enrolled student WHEN the roster is opened THEN the student is listed
<!-- AC_END -->
```

A criterion with no codes beneath it is a planning error, not an acceptable state — §3.7
stops rather than inventing one.

</details>

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
