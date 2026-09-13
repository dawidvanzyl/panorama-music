---
name: qa-design
description: >
  Load this skill when the user says "qa design", "qa-design", or "/qa-design", or
  when the tech lead assigns E2E scenario design for a story. Decomposes a story's
  IT codes into concrete, implementable E2E scenarios — before the story is built —
  and writes them to a frozen design file. Writes no test code.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues
---

## Goal

Turn each IT code assigned to a story into scenarios someone could implement without
guessing: preconditions, seed data, actor, path, expected outcome, and the negative
cases worth proving. The output is one file, with no test code and no selectors.

**This runs before the story is built, and that ordering is what makes it worth
anything.** A scenario designed against finished code can only describe what was
built. It passes first time, proves nothing, and nobody can tell it apart from a real
acceptance test. So never read this story's implementation. (In `subagent` mode you
have no shell, and don't ask another agent to run one for you.) Do read the *existing*
application and E2E suite: without real routes, roles, fixtures and page objects your
scenarios can't be built.

**Rules**
- Write only `{journal_dir}/e2e-design.md`. Nothing else, anywhere.
- Never design for anything under `## Out of Scope`.
- Never invent, renumber or reword an IT code. Codes are frozen at planning, and a new
  one changes the milestone's definition of done. If behaviour clearly must work but
  no code covers it, escalate.
- Never claim coverage you don't have. An honest uncovered row beats a scenario that
  can't fail.

## Inputs

- `issue_number`: required. In `interactive` mode, ask for it if missing: "What is the
  issue number to design scenarios for?"
- `journal_dir`: required. The absolute path to the story's journal.
- `mode`: `interactive` (default) or `subagent`.
- `subagent` only, as file paths: `issue_body_file` (the sub-issue), `epic_body_file`
  and `it_codes_file` (`it-codes.json`). A missing input is escalated. Never guess it,
  and never substitute a shell command.
- In `interactive` mode, fetch the issue yourself with
  `gh issue view {issue_number} --json title,body`, along with the epic and
  `it-codes.json`.

## Procedure

### 1) Read the story

**From the sub-issue:**
- `## Test Specifications`: the complete, authoritative list of IT codes. It's
  present on every issue type. If it says `N/A`, report that and stop.
- `## Functional Requirements`: the observable behaviours.
- `## Domain & Data`: business rules. The negative cases come from here.
- `## API / Interface Contract`: endpoints, side-effects, UI entry points.
- `## Page Architecture` (`layer: frontend` only): screens, hierarchy, interaction
  flow.
- `## Out of Scope`.
- Any **Design reference:** bullet. The named `.design/` file is authoritative for
  what the screen does.

**From the epic:** the `AC{n}` criterion each code serves (mapped in
`it-codes.json`). A scenario that meets the code's wording but misses the criterion's
intent has failed.

**From the E2E suite:** `e2e/fixtures/` (`testUsers.ts`, `db.ts`, the per-context
fixtures) for what can be seeded; `e2e/pages/` for existing page objects; and one
comparable spec in `e2e/features/` for shape and grain. A precondition that no
fixture can produce is a finding, not a design.

### 2) Decompose each IT code

Work in the sub-issue's order. For each code, ask what would have to be observably
true for the behaviour to be delivered, and write one scenario per distinct answer.
Include each of these where it is real:
- **Happy path**, stated precisely enough to be falsifiable.
- **Negative cases**: a rule allowing a transition only under some condition implies
  a scenario proving it's refused otherwise.
- **Permission cases**: the same action attempted by a role that shouldn't be able
  to perform it.
- **Boundaries**: empty, first, last, at capacity, already exists.
- **Persistence**: anything the story claims is recorded survives a reload.

Don't pad. A scenario that can't fail costs a spec, CI time on every run, and
attention whenever it breaks for unrelated reasons.

**Describe behaviour, never selectors.** Use no CSS, no `data-testid`, and no route
strings that don't already exist. Write "the roster lists the student", not
"`#roster-table` contains a row". Selectors are chosen against the real UI. A design
pinned to the wrong one gets "fixed" by weakening the assertion, invisibly.

**Isolation.** The suite runs in parallel. See the unique-value helpers in
`e2e/features/courses/course-management.spec.ts`. Mark each scenario either
**parallel-safe** (it touches only data it seeds itself) or **needs exclusive
{resource}** (it depends on global state, a singleton, or the absence of other data).
Naming the exclusive ones now lets their cost be questioned before it turns into
flakiness.

**Coverage.** Every IT code gets at least one scenario. If one can't be designed,
because its intent is ambiguous or the story doesn't appear to deliver it, record it
as uncovered with the reason.

### 3) Write the design file

Write `{journal_dir}/e2e-design.md` **as you go**. A session can hit its turn or quota
limit without warning, and a file composed in a final turn leaves nothing behind.

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

Include `## Uncovered` only when something is uncovered, and never leave it out just
to look complete.

**The file is frozen the moment you report.** It is the contract the implementation
is built against and the specs are written from. Nobody revises it to match what got
built, not even you, so write it as something you'll be held to.

### 4) Report

Per `.claude/shared/subagent-contract.md`, when the design is complete:

```
VERDICT: DESIGNED
REPORT: {journal_dir}/e2e-design.md
IT_CODES: {n} covered, {n} uncovered
```

When a decision is needed first, use `VERDICT: NEEDS_RULING (n)` with the same
`REPORT:` line.

In `interactive` mode, also give the path and a short summary: how many scenarios,
which codes needed the most decomposition, and any judgement call worth attention.
Never paste the design into the conversation.
