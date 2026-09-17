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

Assign this epic to a GitHub Milestone via the issue's native **Milestone** field (right
sidebar). Never put a milestone tag in the title: `plan-milestone`,
`prepare-milestone-base` and `close-milestone` all derive the milestone from the assigned
milestone's own title.

---

## Acceptance Criteria

Epic-level, testable outcomes for the whole milestone, verified end-to-end rather than per
sub-issue. Write each as **prose**, one numbered criterion per observable outcome, numbered
`AC1`, `AC2`, …

This section is the **independent statement of scope** the plan is checked against:
decomposition reasons about these criteria, the UI audit walks them, and planning's coverage
gate requires each to carry at least one IT code — so a criterion nothing covers surfaces a
decomposition gap, which only works if the criteria were written before, and independently
of, the plan.

**Do not write IT codes here.** `plan-milestone` derives them once decomposition has produced
each sub-issue's API contract and Page Architecture, and inserts them between the markers
below, nested under the criterion each one proves. It never edits, reorders, renumbers or
removes a criterion, so the numbers stay stable identifiers that `it-codes.json` maps codes
back to. (This differs from `## Anticipated Work Areas`, which is entirely tool-owned.)

<!-- AC_START -->
**AC1.** A single observable outcome, stated as behaviour rather than implementation.

**AC2.** Another.
<!-- AC_END -->

<details>
<summary>What this section looks like after planning</summary>

Codes are scoped to this epic's own issue number (`{epic_number}IT{n}`). Each is a checkbox
under the criterion it proves, ticked by `close-milestone` when its Playwright spec passes. A
criterion with no codes is a planning error, not an acceptable state.

```markdown
<!-- AC_START -->
**AC1.** An admin can enrol a student in a course.
- [ ] `45IT1` GIVEN a course with capacity WHEN an admin enrols a student THEN the student is enrolled
- [ ] `45IT2` GIVEN a student already enrolled WHEN an admin enrols them again THEN it is rejected

**AC2.** An enrolled student appears on the course roster.
- [ ] `45IT3` GIVEN an enrolled student WHEN the roster is opened THEN the student is listed
<!-- AC_END -->
```

</details>

---

## Anticipated Work Areas

> Maintained by `plan-milestone` between the markers as sub-issues are created. Do not
> hand-edit between them: inserts are idempotent and append-only, and existing entries are
> never reordered, unchecked or removed.

<!-- AWA_START -->
<!-- AWA_END -->

---

## Out of Scope

Explicitly what this milestone does **not** cover, to prevent scope creep during decomposition.

- Deferred to: #issue or future milestone
