---
name: qa-design
description: >
  Load this skill when the user says "qa design", "qa-design", or "/qa-design", or
  when the tech lead assigns E2E scenario design for a story. Decomposes a story's
  IT codes into concrete, implementable E2E scenarios — before the story is built —
  and writes them to a frozen design file. Writes no test code.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

# Announcement

> Loaded skill: **qa-design**. Designing E2E scenarios for #{issue_number}...

---

## Goal

Turn each IT code assigned to a story into concrete scenarios someone could
implement without guessing: preconditions, seed data, actor, path, expected
outcome, and the negative cases worth proving.

One output file. No test code, no selectors.

## The ordering is the point

This runs **before the story is built**. That is not a scheduling detail — it is
what makes the output worth anything.

A scenario designed against a finished implementation can only describe what was
built. It passes on its first run and proves nothing, and no one downstream can
tell the difference between that and a real acceptance test. Designing first means
the specification exists independently of the code, so a gap between them is
visible when the specs run.

The consequence: **you do not read the story's implementation, because it does not
exist yet.** In `subagent` mode you have no shell at all, which removes any way to
inspect a branch or a diff.

Reading the *existing* application and E2E suite is expected and encouraged — you
need real routes, roles, fixtures and page-object conventions or your scenarios will
be unbuildable. The line is not source-versus-no-source; it is that the code
implementing **this story** is not yet written.

## Inputs

- `issue_number` — required.
- `journal_dir` — required. Absolute path to this story's journal directory. Write
  here and nowhere else.
- `mode` — `interactive` (default) or `subagent`.

In `subagent` mode every input arrives as a path, because you have no shell:

- `issue_body_file` — the sub-issue body.
- `epic_body_file` — the epic body, for the criteria the codes serve.
- `it_codes_file` — `it-codes.json` from planning.

In `interactive` mode, fetch them yourself:

```bash
gh issue view {issue_number} --json title,body
```

If `issue_number` is not available, ask: "What is the issue number to design
scenarios for?" Do not proceed until confirmed.

If a required input is missing in `subagent` mode, do not guess and do not
substitute a shell command for it. Escalate.

---

## Procedure

### 1) Read the story

From the **sub-issue**:

- `## Test Specifications` — the IT codes you must cover. This list is
  authoritative: it is the complete set, and it is not yours to extend. Present on
  every issue type, so this is the one section you read regardless of what kind of
  issue you were given. `N/A` means the issue has no end-to-end behaviour to prove —
  report that and stop rather than inventing scenarios.
- `## Functional Requirements` — the observable behaviours.
- `## Domain & Data` — entities, relationships and business rules. Business rules
  are where the negative cases come from.
- `## API / Interface Contract` — endpoints, side-effects, UI entry points.
- `## Page Architecture` — screens, component hierarchy, interaction flow. Present
  only for `layer: frontend` stories.
- `## Out of Scope` — never design a scenario for anything listed here.
- Any **Design reference:** bullet — the named `.design/` file is authoritative for
  what the screen does, not a suggestion.

From the **epic**, for each IT code, the `AC{n}` criterion it serves. `it-codes.json`
records the mapping. The criterion is why the code exists; a scenario that satisfies
the code's wording but not the criterion's intent has missed.

From the **existing E2E suite**, the conventions your scenarios must be expressible
in:

- `e2e/fixtures/` — what can already be seeded, and how. `testUsers.ts`, `db.ts`,
  and the per-context fixtures tell you what a precondition can assume.
- `e2e/pages/` — which screens have page objects, and what they can already do.
- One comparable spec in `e2e/features/` — for the shape and grain the suite uses.

A precondition that no fixture can produce is a finding, not a design. Say so.

### 2) Decompose each IT code

Work code by code, in the order they appear in the sub-issue.

For each, ask what would have to be true, observably, for this behaviour to be
delivered — then write one scenario per distinct answer.

Always consider, and include where they are real:

- **The happy path**, stated precisely enough to be falsifiable.
- **Negative cases** — the business rules in `## Domain & Data` are the source.
  A rule that says a transition is only allowed under a condition implies a scenario
  proving it is refused otherwise.
- **Permission cases** — the same action by a role that should not be able to
  perform it. This project has distinct roles and they change outcomes.
- **Boundaries** — empty, first, last, at-capacity, already-exists.
- **Persistence** — where the story claims something is recorded, that it survives
  a reload.

Do not pad. A scenario that cannot fail is noise: it costs a spec to write, time on
every CI run, and attention every time it breaks for an unrelated reason.

### 3) Write behaviour, never selectors

No CSS, no `data-testid`, no route strings that do not already exist.

Selectors are chosen at implementation time against the real UI. A design pinned to
a selector the implementation then names differently is worse than no design — it
gets "fixed" by weakening the assertion, and the weakening is invisible.

Say *"the roster lists the student"*, not *"`#roster-table` contains a row"*.

### 4) Judge isolation

The suite runs in parallel across workers, and the existing specs go to real trouble
to stay independent — see the unique-value helpers in
`e2e/features/courses/course-management.spec.ts`.

Mark each scenario:

- **parallel-safe** — operates only on data it seeds itself.
- **needs exclusive {resource}** — depends on global state, a singleton record, or
  the absence of other data.

Exclusive scenarios are expensive and sometimes unavoidable. Naming them here lets
the cost be seen and questioned now, rather than discovered as flakiness later.

### 5) Coverage

**Every IT code in the sub-issue must have at least one scenario.**

If one cannot be designed — the intent is ambiguous, or it describes behaviour this
story does not appear to deliver — record it explicitly as uncovered with the reason.
Never invent a scenario that satisfies the code's wording while proving nothing;
that produces a green suite and a false claim.

If you find behaviour that clearly must work but **no IT code covers it**, escalate.
Do not invent an IT code. Codes are frozen at planning Gate 4, and adding one changes
the definition of done for the milestone.

### 6) Write the design file

```
{journal_dir}/e2e-design.md
```

Write it **as you go**, not at the end. You cannot tell when you are about to hit a
turn limit or when the session runs out of quota, and a file composed in a final turn
leaves nothing behind when that happens.

Structure:

```markdown
# E2E scenario design — #{issue_number} {title}

Sources: sub-issue #{issue_number}, epic #{epic}, it-codes.json
Status: FROZEN once reported

## `{IT_CODE}` — serves AC{n}

> {the epic criterion text, verbatim}
> {the IT code's GIVEN/WHEN/THEN, verbatim}

### S1 — {short name}

- **Actor:** {role}
- **Precondition:** {state the system must be in}
- **Seed:** {what has to be created, and the fixture that can do it}
- **Path:** {numbered interaction steps, behavioural}
- **Expect:** {what must be observably true}
- **Isolation:** parallel-safe | needs exclusive {resource}

### S2 — {negative case name}
...

## Uncovered

| IT code | Why no scenario | Recommendation |
|---|---|---|
```

Omit the `## Uncovered` table when everything is covered. Never omit it to appear
complete.

### 7) Freeze

The file is frozen the moment you report.

It becomes the contract the implementation is built against and the specs are written
from. Nobody revises it to match what got built — not the developer, not a later QA
pass, not you. Write it as something you would be held to.

### 8) Report

Per `.claude/shared/subagent-contract.md`:

```
VERDICT: DESIGNED
REPORT: {journal_dir}/e2e-design.md
IT_CODES: {n} covered, {n} uncovered
```

Or, if a decision is needed before this can be finished:

```
VERDICT: NEEDS_RULING (n)
REPORT: {journal_dir}/e2e-design.md
```

`interactive` mode — also give the path and a short summary: how many scenarios,
which codes needed the most decomposition, any judgement call worth attention. Never
paste the design into the conversation.

---

## Guardrails

- Never read the implementation of the story being designed. In `subagent` mode you
  have no shell; do not ask another agent to run one for you.
- Never write test code, and never write outside `journal_dir`.
- Never invent, renumber or reword an IT code — escalate instead.
- Never design a scenario for work under `## Out of Scope`.
- Never claim coverage you do not have. An honest uncovered row is worth more than a
  scenario that cannot fail.
- Behaviour, not selectors. Every time.
