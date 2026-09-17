---
name: plan-critique
description: >
  Load this skill when the user says "plan critique", "plan-critique",
  "/plan-critique", or when the tech lead assigns plan critique for a story.
  Critiques the development and QA plans before the story is built, at most twice, and
  records unresolved objections to plan-open-issues.md for the owner. Writes no plan.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues
---

## Goal

Judge whether `plan-dev.md` and `plan-qa.md` are sound enough to build against, and
name what isn't — in the **same severity language the reviewer uses**, so the plan gate
is a genuine stand-in for the review. You do this at most twice per story. You write
only `plan-open-issues.md`; you never edit the plans — the `planner` agent revises them
from your objections.

Findings follow `.claude/shared/review-severity.md`: the same severity levels
(❌ Blocker, ⚠️ Warning, ❓ Question, 💡 Suggestion), the same rule that **every finding
cites a source**, and the same standards-doc list. The one adaptation is the anchor —
you have no diff, so each finding points at a plan section, a requirement or a
standard-doc rule rather than `file:line`.

The owner reads `plan-open-issues.md` at the plan gate. The gate keys on **Blockers**:
if none is open after your last turn, the tech lead auto-approves and the story proceeds
with no owner pause; any open Blocker sends the plans to the owner. Warnings, Questions
and Suggestions never gate — they travel to the developer as inputs to honour or
disposition — but none is optional padding. So spend a Blocker only on something that
must change before the build, and raise the softer levels honestly.

## Inputs

- `issue_number`, `journal_dir`: required.
- `dev_plan_file`, `qa_plan_file`: the plans to critique.
- `issue_body_file`, `epic_body_file`, `it_codes_file`, `test_intents_file`: the
  authoritative sources, as paths.
- `turn`: `1` or `2`. Turn 2 re-judges the revised plans against your own turn-1
  objections.
- `mode`: `interactive` (default) or `subagent`.

## What to look for

Read both plans against the story, the epic, the codebase and the standards docs
(`docs/coding-standards.md`, the backend/frontend variants for the story's scope, and
`docs/security-standards.md` where the change touches a security surface). A finding is
a concrete gap between what the plan says and what the story or a standard requires —
not a stylistic preference.

**In `plan-dev.md`:**
- A `## Functional Requirements` item or `AC{n}` criterion no step delivers.
- A `## Domain & Data` rule the approach ignores or contradicts.
- A documented standard the approach violates — a `docs/coding-standards*.md` rule, a
  recurring trap the `## Standards` section should have named and didn't (e.g. per-row
  repository calls inside a loop, which are a joining query), or a `docs/security-
  standards.md` control the change should honour (authorization on a new endpoint,
  input validation, no data over-exposure). A standards violation caught here is a
  review cycle saved; caught at review, it's rework.
- An approach that fights an existing pattern in the codebase, where a cheaper one
  exists (grep for how the current code does the comparable thing before asserting
  this).
- A UC code with no coverage row, or a row that wouldn't actually prove the intent.
- Work planned that the sub-issue puts `## Out of Scope`.

**In `plan-qa.md`:**
- An IT code with no scenario and no honest `## Uncovered` row.
- A missing negative, permission, boundary or persistence case the domain rules imply.
- A scenario asserting behaviour outside the story, or one pinned to a selector or
  route that doesn't exist.
- A precondition no fixture in `e2e/fixtures/` can produce.
- A scenario that can't fail — it costs a spec and CI time and proves nothing.

Severity, per the shared rules: a requirement, contract, domain rule or documented
standard the plan violates or fails to deliver is a **Blocker** — it must change before
the build. A soft concern (a missing safeguard, a questionable-but-workable approach) is
a **Warning**. Genuine ambiguity you can't judge without the owner is a **Question**. An
out-of-scope observation or an undocumented preference is a **Suggestion**. Implementing
something the sub-issue lists `## Out of Scope` is the exception — that is a Blocker.

Don't pad. A critique of ten trivia buries the one gap that matters, and every open
Blocker you leave is a decision the owner has to make.

## Write `plan-open-issues.md`

One findings table, in the reviewer's column shape adapted for a plan (no `file:line`,
plus a `Status` column for the revision loop). On turn 2, update each turn-1 finding's
status in place rather than duplicating it — the file's final state is what the owner
reads.

```markdown
# Plan open issues — #{issue_number} {title}

Turns run: {1 | 2}

| # | Severity | Anchor | Category | Detail (gap · source · suggested fix) | Status |
|---|---|---|---|---|---|
| 1 | ❌ | plan-dev §API | Standards | Handler loops a repo call per row — `coding-standards-backend.md` §N+1 requires a joining query. Plan the joining function. | open |
| 2 | ⚠️ | 280IT4 / plan-qa S2 | Requirements | No negative case for the withdrawn-student path the domain rules imply. Add a scenario. | resolved rev 2 |
```

- **Severity**: ❌ Blocker · ⚠️ Warning · ❓ Question · 💡 Suggestion.
- **Anchor**: the plan section (`plan-dev §Approach`), IT/AC/UC code, or standards-doc
  rule — never a `file:line`, which doesn't exist yet.
- **Category**: Standards, Requirements, Correctness, Contract, Security or Design, as
  in `review-severity.md`.
- **Status**: `open` · `resolved rev {n}` · `won't-fix ({reason})`.

If you find nothing — first turn or second — write the file with `Turns run:` and a
single line: `No findings. Both plans are sound to build against.` An empty table is a
real, common, good outcome; never invent a finding to look thorough.

## Report

Per `.claude/shared/subagent-contract.md`:

```
VERDICT: CRITIQUED
REPORT: {journal_dir}/plan-open-issues.md
BLOCKERS: {n}
OPEN: {n}
```

`BLOCKERS` drives the gate; `OPEN` is every still-open finding of any severity.
`BLOCKERS: 0` tells the tech lead it can auto-approve (the open Warnings/Questions/
Suggestions travel to the developer). `BLOCKERS: {n>0}` after turn 2 tells it to take
the plans and the open findings to the owner. Never paste the plans or the table into
the reply.
