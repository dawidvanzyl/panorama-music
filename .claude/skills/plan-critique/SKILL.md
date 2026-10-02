---
name: plan-critique
description: >
  Load this skill when the user says "plan critique", "plan-critique",
  "/plan-critique", or when the tech lead assigns plan critique for a story.
  Critiques a version of the development and QA plans before the story is built, at
  most twice per question round, and returns APPROVE or REVISE with tagged notes the
  tech lead turns into owner questions. Writes no plan.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues
---

## Goal

Judge whether `plan-dev-v{n}.md` and `plan-qa-v{n}.md` are sound enough to build
against, and say exactly what must change if they aren't. You write only
`critique-v{n}.md`; you never edit the plans — the `planner` agent revises them from
your required changes.

Work **adversarially**: soundness is not the default. Assume each plan is flawed until
it survives scrutiny, and actively try to break it — the requirement no step delivers,
the domain rule the approach violates, the IT code with no scenario, the failure,
negative or permission case the plan waves past. Then turn the same scrutiny on your
own objections (step 4): an objection you can't source is a misread, and a misread
sent to the planner costs a revision.

You don't grade severity. A gap either **must change before the build** (a required
change) or it doesn't (an `AUDIT:` note). Anything you can't settle from a source is a
`QUESTION:` for the owner — never a guess, and never a softened required change.

## Inputs

- `issue_number`, `journal_dir`: required.
- `version`: the plan version under critique.
- `dev_plan_file`, `qa_plan_file`: `plan-dev-v{version}.md` and `plan-qa-v{version}.md`.
- `issue_body_file`: the issue. For a milestone story also `epic_body_file`,
  `it_codes_file` and `test_intents_file`; a standalone issue has none of the three,
  and its own `## Functional Requirements`, `## Test Specifications` and
  `## Acceptance Criteria (G/W/T)` take their place. All as paths.
- `answers_file`: `plan-answers.md`, when the owner has answered a question round.
- `prev_critique_file`: your previous `critique-v{n}.md`, on a second critique in a
  round.
- `mode`: `interactive` (default) or `subagent`.

## Procedure

### 1) Read the plans and the sources

Read both plans, including plan-dev's `## Notes`, against the issue, the epic (if
any), the mockup any **Design reference:** names, `answers_file`, and the standards docs
(`docs/coding-standards.md`, the backend/frontend variants for the story's scope, and
`docs/security-standards.md` where the change touches a security surface).

An owner answer is authoritative: a requirement answer settles what is required, an
engineering answer settles how it is built and may override a documented rule. Never
raise again what an answer settled.

### 2) Verify against source, don't re-explore

Open **only** the files the plans' claims hinge on and confirm them. If the plan says
"extend the existing handler and reuse fixture X", open that handler and that fixture
and confirm both exist and the shape fits. You are verifying load-bearing claims, not
re-planning.

On a second critique, re-examine only what changed since `prev_critique_file`, and
check each of your earlier required changes was applied or `DECLINED` with a reason.

### 3) Evaluate

**In `plan-dev`:**
- **Comprehension** — a misread of a `## Functional Requirements` item, an `AC{n}`
  criterion, the mockup or an owner answer; or existing code that already does this
  and the plan missed it.
- A requirement or criterion no step delivers.
- A `## Domain & Data` rule the approach ignores or contradicts.
- A documented standard the approach violates — a `docs/coding-standards*.md` rule, a
  recurring trap the `## Standards` section should have named and didn't (e.g. per-row
  repository calls inside a loop, which are a joining query), or a `docs/security-
  standards.md` control the change should honour (authorization on a new endpoint,
  input validation, no data over-exposure).
- An approach that fights an existing pattern in the codebase, where a cheaper one
  exists (grep for how the current code does the comparable thing before asserting
  this).
- A UC code with no coverage row, or a row that wouldn't actually prove the intent.
- Work planned that the sub-issue puts `## Out of Scope`.
- **Notes** — an ambiguity the plan resolved silently instead of tagging an
  `ASSUMPTION` or `DECISION`; a `DECISION` whose chosen reading the sources don't
  support.

**In `plan-qa`:**
- An IT code with no scenario and no honest `## Uncovered` row.
- A missing negative, permission, boundary or persistence case the domain rules imply.
- A scenario asserting behaviour outside the story, or one pinned to a selector or
  route that doesn't exist.
- A precondition no fixture in `e2e/fixtures/` can produce.
- A scenario that can't fail — it costs a spec and CI time and proves nothing.

**Requirement conflicts** — a requirement (an issue section, a mockup element or an
owner answer) that can only be met by breaking a documented rule. This is not the
planner's fault and a `REVISE` can't fix it: emit it as a `CONFLICT:` note. An
engineering answer that overrode the rule settles it; don't raise it again.

### 4) Challenge your own objections

Before writing anything, take each objection and try to refute it: re-read the source
it rests on, and drop it if the plan's reading holds. Keep only what survives, each
tied to the requirement, standard or source line it enforces.

### 5) Write `critique-v{version}.md`

```markdown
# Plan critique — #{issue_number} {title} — v{version}

VERDICT: {APPROVE | REVISE (n)}

## Required changes
1. {plan section or code} — {what must change} — because {requirement / standard /
   source line}

## Notes
- CONFLICT K{n}: "{requirement, verbatim}" — breaks {rule} ({doc §}) — compliant
  alternative: {what you'd build}
- RESOLVED: A{n} — {what you verified, and where}
- QUESTION Q{n} ({requirement | engineering}): {question} — current assumption: {x}
- AUDIT: {what you checked; objections you raised or dropped, and why}
```

- **`APPROVE`** — the plans are sound to build. Minor points go in as `AUDIT:`; they
  don't block.
- **`REVISE (n)`** — `n` required changes. Keep it to what genuinely must change.
- A `CONFLICT` or `QUESTION` doesn't by itself force `REVISE`: the owner settles those.
- **`RESOLVED:`** — when a source read settles a planner `ASSUMPTION`. The planner
  drops it and the owner isn't asked.
- **`QUESTION:`** — anything you couldn't verify from source that a person must
  answer. This is the only form a question may take; never raise one in prose.

Omit empty sections.

## Report

Per `.claude/shared/subagent-contract.md`:

```
VERDICT: APPROVE | REVISE (n)
REPORT: {journal_dir}/critique-v{version}.md
QUESTIONS: {n}
CONFLICTS: {n}
RESOLVED: {n}
```

Never paste the plans or the critique into the reply.
