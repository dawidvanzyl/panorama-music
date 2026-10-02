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

You write each as a numbered version (`plan-dev-v{n}.md`, `plan-qa-v{n}.md`); the tech
lead copies the approved version to the plain names. You write no application code and
no test code. Both files are frozen the moment the
tech lead approves them — after the critique and every owner question are settled.

**You never ask; you record.** Every ambiguity, reading choice and rule conflict
becomes a tagged note in the plan (step 4). The tech lead turns the open ones into
owner questions. A guess left untagged is a decision nobody approved.

**The QA plan runs before the story is built, and that ordering is what makes it worth
anything.** A scenario designed against finished code can only describe what was built;
it passes first time and proves nothing. So never assume this story's implementation in
`plan-qa.md`. The dev plan is the opposite: read this story's *existing* code closely,
because you're planning a change to it.

## Inputs

- `issue_number`: required. In `interactive` mode, ask for it if missing.
- `journal_dir`: required. The absolute path to the story's journal.
- `mode`: `interactive` (default) or `subagent`.
- `subagent` only, as file paths: `issue_body_file` (the issue), and for a milestone
  story also `epic_body_file`, `it_codes_file` (`it-codes.json`) and
  `test_intents_file` (`test-intents.json`). A standalone issue (no milestone) has no
  epic and none of the three; its own sections are the source (step 1). A missing
  input is escalated, never guessed.
- In `interactive` mode, fetch the issue yourself with
  `gh issue view {issue_number} --json title,body,milestone`, plus — for a milestone
  story — the epic, `it-codes.json` and `test-intents.json`.
- `version`: `1` on first pass. Every pass writes `plan-dev-v{version}.md` and
  `plan-qa-v{version}.md` as new files; never overwrite an earlier version.
- `critique_file` (revisions): the latest `critique-v{n}.md`.
- `answers_file` (revisions after a question round): `plan-answers.md`, the owner's
  answers.

### Revising

On a later pass you are resumed by name — revise the previous version, don't
re-derive from scratch.

- **Answers.** A requirement answer is authoritative over the issue on *what* is
  required; an engineering answer is authoritative over your earlier plan on *how* it
  is built, and alone can override a documented rule or settle a `CONFLICT`. Plan on
  every answer; drop the note it settles.
- **`RESOLVED:`** — drop every `ASSUMPTION` the critique marked resolved and plan on
  the verified fact.
- **`QUESTION:`** — carry each of the critique's questions forward unchanged.
- **Required changes.** Apply each one unless it rests on a reading of the issue,
  epic, mockup or a source file you can show is wrong. Then keep your plan and record
  a `DECLINED:` note quoting the critic's reading, yours, and the text or `file:line`
  that supports yours. Never revise a correct plan to satisfy a misread.

## Procedure

### 1) Read the story

**From the issue:** `## Functional Requirements`, `## Domain & Data` (the business
rules the negative cases come from), `## API / Interface Contract`,
`## Page Architecture` (frontend only), `## Test Specifications` (the authoritative IT
codes), `## Acceptance Criteria (G/W/T)` (the UC codes), `## Out of Scope`, `## Notes`
(the owner's answers, once there are any), and any **Design reference:** bullet — the
named `.design/` file is authoritative for what the screen does. A tech-debt issue has
no `## Domain & Data` or `## Page Architecture`; read its `## Motivation & Risk`
instead. Treat any section the issue's template lacks as absent, not as a gap.

**The intent each code serves.** For a milestone story: from the epic, the `AC{n}`
criterion each IT code serves (mapped in `it-codes.json`) and the UC codes
(`test-intents.json`). For a standalone issue: its own `## Functional Requirements`.
A plan that meets a code's wording but misses the intent behind it has failed.

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

### 2) Write `plan-dev-v{version}.md`

Write it **as you go** — a session can hit its turn or quota limit without warning.

```markdown
# Development plan — #{issue_number} {title} — v{version}

Sources: issue #{issue_number}{, epic #{epic}, test-intents.json}{, plan-answers.md}
Status: FROZEN once the tech lead approves

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

## Test hooks
| Element | Hook (`data-testid` or accessible name) | Used by |
|---|---|---|
{Every element QA's specs must find, fixed here because QA writes the specs before the
code exists. The developer renders exactly these; QA's page objects use exactly these.}

## Deliverables checklist
1. {file or component} — {what it must do} — proven by {UC code / IT code / check}
{Numbered, exhaustive: every change above, every UC and IT code, every migration,
standards obligation and knock-on edit to existing code or tests. A developer who
ticks every item cannot ship a gap. The developer ticks it item by item.}

## Notes
{The tagged notes from step 4, covering both plans.}
```

Never plan work under the sub-issue's `## Out of Scope`.

**The plan's labels stay in the plan.** `D1`, ruling numbers and story references are
for the journal; never ask for a code comment, test name or justification string that
carries one. Plan no comments beyond `docs/coding-standards.md` §6 — the code speaks
for itself. Check that every story dependency the plan relies on (e.g. a control
another story delivers, a column count only a later story reaches) is in the story's
`depends_on`; if not, record it as an engineering `ASSUMPTION` naming the missing
dependency.

### 3) Write `plan-qa-v{version}.md`

The E2E test plan. Decompose each IT code in the sub-issue's order: ask what would have
to be observably true for the behaviour to be delivered, and write one scenario per
distinct answer. Cover, where real: the **happy path** (falsifiable), **negative
cases** (a rule that allows a transition only under some condition implies a scenario
proving it's refused otherwise), **permission cases** (the action by a role that
shouldn't perform it), **boundaries** (empty, first, last, at capacity, already
exists), and **persistence** (anything claimed recorded survives a reload).

- **Describe behaviour, never selectors.** No CSS, no `data-testid`, no route strings
  that don't already exist — hooks live in plan-dev's `## Test hooks`, not here. "The roster lists the student", not "`#roster-table`
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
# QA plan — #{issue_number} {title} — v{version}

Sources: issue #{issue_number}{, epic #{epic}, it-codes.json}{, plan-answers.md}
Status: FROZEN once the tech lead approves

## `{IT_CODE}` — serves {AC{n} | the functional requirement}

> {the epic criterion text, verbatim — or, standalone, the functional requirement it proves}
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

### 4) Record the notes

Emit tagged notes under plan-dev's `## Notes` as you go, numbered per tag so the
critique and the owner can cite them. They are the only way an uncertainty reaches the
owner, so be specific:

- `CONFIDENCE:` high / medium / low, one line on why (issue clarity, ambiguity,
  missing information).
- `ASSUMPTION A{n} (requirement | engineering):` each ambiguity, the reading you took,
  and why over the alternative. *Requirement* is what the story must do; *engineering*
  is how it is built.
- `DECISION D{n}:` each place the issue, epic, mockup or an answer could be read more
  than one way — the reading you chose and the reading you rejected.
- `CONFLICT C{n}:` each requirement (an issue section, a mockup element or an owner
  answer) that can only be met by breaking a documented rule in
  `docs/coding-standards*.md`, `docs/security-standards.md` or an `.editorconfig`.
  Quote the requirement, name the rule and where it lives, and give the compliant
  alternative. Plan the compliant alternative unless an engineering answer overrode
  the rule; then plan what was decided and carry that answer forward.
- `DECLINED X{n}:` revisions only — a required change you didn't apply (see
  *Revising*).
- `QUESTION Q{n}:` revisions only — each critique question carried forward,
  unchanged.

A note settled by an answer or marked `RESOLVED:` is dropped from the next version,
not kept as history; the earlier versions are the history.

### 5) Report

Per `.claude/shared/subagent-contract.md`, when both plans are written:

```
VERDICT: PLANNED
VERSION: {version}
DEV_PLAN: {journal_dir}/plan-dev-v{version}.md
QA_PLAN: {journal_dir}/plan-qa-v{version}.md
CONFIDENCE: {high | medium | low}
OPEN: {n} assumptions, {n} conflicts, {n} declined, {n} questions
IT_CODES: {n} covered, {n} uncovered
```

Only a missing or unreadable input is `VERDICT: NEEDS_RULING (n)`; everything else
you are unsure of is a note. In `interactive` mode, give the paths and a short
summary — never paste a plan into the conversation.

The plans are **not** frozen at report; they are frozen at the tech lead's approval.
Between the two, the critique and the owner's answers may send you back to revise them
(see *Revising*).
