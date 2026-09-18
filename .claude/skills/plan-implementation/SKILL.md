---
name: plan-implementation
description: >
  Load this skill when the user says "plan implementation", "plan-implementation",
  "/plan-implementation", or when the tech lead assigns planning for a story. Produces
  two frozen plans before the story is built — a development plan for the developer and
  a QA plan for qa-implement — from the story, the epic and the existing codebase.
  Writes plans, never code.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues
---

## Goal

Produce two plans a story can be built and proven against, in enough detail that
nobody downstream has to guess:

- **`plan-dev.md`** — how the developer builds it: the layers and files to touch, the
  domain and data changes, the interface contract, the UC codes to satisfy, and the
  risks.
- **`plan-qa.md`** — how `qa-implement` proves it: each IT code decomposed into
  concrete E2E scenarios with preconditions, seed data, paths and negative cases.

You write no application code and no test code. Both files are frozen the moment the
owner approves them.

**The QA plan runs before the story is built, and that ordering is what makes it worth
anything.** A scenario designed against finished code can only describe what was built;
it passes first time and proves nothing. So never assume this story's implementation in
`plan-qa.md`. The dev plan is the opposite: read this story's *existing* code closely,
because you're planning a change to it.

## Inputs

- `issue_number`: required. In `interactive` mode, ask for it if missing.
- `journal_dir`: required. The absolute path to the story's journal.
- `mode`: `interactive` (default) or `subagent`.
- `subagent` only, as file paths: `issue_body_file` (the sub-issue), `epic_body_file`,
  `it_codes_file` (`it-codes.json`) and `test_intents_file` (`test-intents.json`). A
  missing input is escalated, never guessed.
- In `interactive` mode, fetch the issue yourself with
  `gh issue view {issue_number} --json title,body`, plus the epic, `it-codes.json` and
  `test-intents.json`.
- `revision`: `1` on first pass. On a later pass you are resumed by name with the
  critique's objections in `plan-open-issues.md` — read it, revise both plans, and
  don't re-derive from scratch.

## Procedure

### 1) Read the story

**From the sub-issue:** `## Functional Requirements`, `## Domain & Data` (the business
rules the negative cases come from), `## API / Interface Contract`,
`## Page Architecture` (frontend only), `## Test Specifications` (the authoritative IT
codes), `## Out of Scope`, and any **Design reference:** bullet — the named `.design/`
file is authoritative for what the screen does.

**From the epic:** the `AC{n}` criterion each IT code serves (mapped in
`it-codes.json`) and the UC codes (`test-intents.json`). A plan that meets a code's
wording but misses the criterion's intent has failed.

**From the codebase (dev plan):** the routes, handlers, domain types, migrations and
frontend components this story changes. Plan against the patterns that exist — an
approach that fights them is what the critique will flag.

**From the standards (dev plan):** `docs/coding-standards.md` always, plus
`docs/coding-standards-backend.md` and `src/.editorconfig` for backend scope,
`docs/coding-standards-frontend.md` and `frontend/.editorconfig` for frontend scope,
and `docs/security-standards.md` when the change touches authentication, authorization,
input handling, data exposure or a similar surface. Plan an approach that already
conforms — a plan that fights a documented standard becomes a review finding and a
rework cycle, which is exactly what planning ahead of the build is meant to prevent.
The recurring ones (e.g. per-row repository calls inside a loop) belong in the plan as
the joining query, not discovered at review.

**From the E2E suite (QA plan):** `e2e/fixtures/` for what can be seeded, `e2e/pages/`
for existing page objects, and one comparable spec in `e2e/features/` for shape and
grain. A precondition no fixture can produce is a finding, not a plan.

### 2) Write `plan-dev.md`

Write it **as you go** — a session can hit its turn or quota limit without warning.

```markdown
# Development plan — #{issue_number} {title}

Sources: sub-issue #{issue_number}, epic #{epic}, test-intents.json
Status: FROZEN once the owner approves

## Approach
{2–4 sentences: the shape of the change and why this way, given the existing code.}

## Changes by layer
- **Domain / data:** {types, rules, migrations}
- **API / handlers:** {endpoints, side-effects, validation}
- **Frontend:** {components, pages, state} — omit if backend-only

## Standards
{The coding-standards or security-standards rules this change must honour, and how the
approach honours them — cite the doc. Name the recurring traps you've deliberately
avoided (e.g. no per-row repository call in a loop). "None relevant" is a valid entry
only for a change that genuinely touches nothing the standards cover.}

## Unit & service coverage
| UC code | What it proves | Where |
|---|---|---|

## Risks & decisions
{Anything the developer will have to decide, and your recommendation. Any dependency
on another story. Anything explicitly out of scope per the sub-issue.}
```

Never plan work under the sub-issue's `## Out of Scope`.

### 3) Write `plan-qa.md`

The E2E test plan. Decompose each IT code in the sub-issue's order: ask what would have
to be observably true for the behaviour to be delivered, and write one scenario per
distinct answer. Cover, where real: the **happy path** (falsifiable), **negative
cases** (a rule that allows a transition only under some condition implies a scenario
proving it's refused otherwise), **permission cases** (the action by a role that
shouldn't perform it), **boundaries** (empty, first, last, at capacity, already
exists), and **persistence** (anything claimed recorded survives a reload).

- **Describe behaviour, never selectors.** No CSS, no `data-testid`, no route strings
  that don't already exist. "The roster lists the student", not "`#roster-table`
  contains a row". A plan pinned to the wrong selector gets "fixed" by weakening the
  assertion, invisibly.
- **Mark isolation.** Each scenario is **parallel-safe** (touches only data it seeds)
  or **needs exclusive {resource}** (depends on global state or the absence of other
  data). See the unique-value helpers in
  `e2e/features/courses/course-management.spec.ts`.
- **Every IT code gets at least one scenario.** If one can't be designed — ambiguous
  intent, or the story doesn't deliver it — record it under `## Uncovered` with the
  reason. An honest uncovered row beats a scenario that can't fail. Never invent,
  renumber or reword an IT code; codes are frozen at planning and a new one changes the
  definition of done — escalate instead.

```markdown
# QA plan — #{issue_number} {title}

Sources: sub-issue #{issue_number}, epic #{epic}, it-codes.json
Status: FROZEN once the owner approves

## `{IT_CODE}` — serves AC{n}

> {the epic criterion text, verbatim}
> {the IT code's GIVEN/WHEN/THEN, verbatim}

### S1 — {short name}
- **Actor:** {role}
- **Precondition:** {state the system must be in}
- **Seed:** {what to create, and the fixture that can do it}
- **Path:** {numbered behavioural steps}
- **Expect:** {what must be observably true}
- **Isolation:** parallel-safe | needs exclusive {resource}

### S2 — {negative case name}
...

## Uncovered
| IT code | Why no scenario | Recommendation |
|---|---|---|
```

Include `## Uncovered` only when something is uncovered.

### 4) Report

Per `.claude/shared/subagent-contract.md`, when both plans are written:

```
VERDICT: PLANNED
DEV_PLAN: {journal_dir}/plan-dev.md
QA_PLAN: {journal_dir}/plan-qa.md
IT_CODES: {n} covered, {n} uncovered
```

When a decision is needed before you can plan, use `VERDICT: NEEDS_RULING (n)` with the
same paths. In `interactive` mode, give the paths and a short summary — never paste a
plan into the conversation.

The plans are **not** frozen at report; they are frozen at owner approval. Between the
two, the plan-critique agent may send you back to revise them (step Inputs `revision`).
