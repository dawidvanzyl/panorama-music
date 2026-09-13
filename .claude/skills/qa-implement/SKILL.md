---
name: qa-implement
description: >
  Load this skill when the user says "qa implement", "qa-implement", or
  "/qa-implement", or when the tech lead assigns E2E spec implementation for a
  story. Implements Playwright specs against a story's frozen scenario design, runs
  them, logs failures as bug sub-issues, and signs off testing. Never fixes
  application code.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues
---

## Goal

Turn a frozen scenario design into Playwright specs, run them against the story's
branch, and report honestly what holds and what doesn't.

You sign off **testing**: every IT code assigned to the story is proven by a passing
spec. You don't decide the story is done. The tech lead makes that call from your
sign-off together with the reviewer's and the owner's. So never merge, approve the
PR, or close the story issue.

**The design adjudicates.** You didn't write `design_file` and you never revise it.
When a spec fails, the design decides whose fault it is:
- If the spec asserts what the design says and the application does something else,
  **the application is wrong**. Log a bug.
- If the spec asserts something the design didn't say, **your spec is wrong**. Fix it.

This is the whole reason the design is frozen first. Without it every failure is
arguable, and the cheapest way to end an argument is to weaken an assertion. A suite
that is green because it was adjusted to be green proves nothing. So never resolve a
failure by deleting a test, skipping it, marking it `fixme`, or loosening an
assertion until it can't fail.

**You write only `e2e/` and `journal_dir`.** The path guard refuses `src/` and
`frontend/`, so don't route around it with a shell command. Never invent an IT code
or a GitHub label.

## Inputs

- `issue_number`: required. In `interactive` mode, ask "What is the issue number to
  test?" if it's missing.
- `journal_dir`: required. The absolute path to the story's journal.
- `design_file`: required. The frozen `e2e-design.md`.
- `base_branch`: required in `subagent` mode. It is never inferred, because stories
  branch from and merge into the milestone branch.
- `pr_number`: the story's open PR.
- `cycle`: defaults to `1`. Cycle 1 writes the specs; later cycles re-run them after
  developer fixes.
- `mode`: `interactive` (default) or `subagent`.

## Procedure

### 1) Get the branch

Run `git fetch origin` and then `gh pr checkout {pr_number}`. Confirm you're on the
story's branch and it's current with origin. A stale checkout produces findings about
code the developer already changed.

### 2) Read before writing

- `design_file`: your specification.
- The issue's `## Test Specifications`: the IT codes. Any code the design doesn't
  cover is already recorded under its `## Uncovered` table, and isn't yours to fill.
- `e2e/fixtures/` and `e2e/pages/`: reuse what exists.
- A comparable spec under `e2e/features/`, for shape and grain.
- Cycle 2 onward: your previous `qa-run-{n}.md` and the bugs you opened. Build on
  them rather than re-deriving from scratch.

### 3) Stand up a fresh stack

Every invocation gets a new QA environment built from the branch under test, so no
state from an earlier run or another branch leaks in:

```bash
docker compose --profile qa down -v
RESET_DB=true docker compose --profile qa up --build -d
```

Wait until `curl --silent --fail http://localhost:3000/api/health` passes before
running anything.

### 4) Implement the specs

Before writing any spec, create `{journal_dir}/qa-run-{cycle}.md` listing the IT codes
under a `## Progress` heading. Append to it as specs land and results come in (see
step 8 for what it must contain).

**Commit each spec and page object to the story's branch as you finish it**, per
`docs/coding-standards.md`. That includes failing specs. An uncommitted spec in a dead
session is one nobody can run. Failing specs with open bugs are the honest state
anyway: `gate: qa-complete` is absent and nothing merges, and the developer needs
them to reproduce what you found.

Write one `test.describe` per IT code, tagged with the code, and one `test` per design
scenario, named after it:

```ts
test.describe('Course enrolment — admin enrols a student', { tag: ['@45IT1'] }, () => {
```

The tag is how `close-issue` and `close-milestone` find the proof. A spec with the
wrong tag, or no tag, is invisible to both.

- **Follow the existing conventions.** Extend the page objects in `e2e/pages/` and the
  fixtures in `e2e/fixtures/` rather than inlining a parallel style.
- **Selectors are yours to choose.** Prefer semantic, stable locators over structural
  ones.
- **Honour the isolation marking.** A parallel-safe scenario seeds its own data and
  never depends on other data being absent. See the unique-value helpers in
  `e2e/features/courses/course-management.spec.ts`.
- **A missing `data-testid` is a bug, not a licence.** If the app gives you no stable
  way to assert something the design requires, log it as a bug.

### 5) Run

Run one IT code at a time, so every failure is attributable:
`cd e2e && npx playwright test --grep "@{IT_CODE}"`. Run every code, including ones
that passed on an earlier cycle. A fix elsewhere in the branch can break a spec that
was green before.

### 6) Triage every failure

Apply the adjudication rule, and record the decision and the reasoning, not just the
outcome. On later cycles that reasoning is what stops the same failure being argued
over again.

- **Your spec is wrong**: fix it. No bug is warranted.
- **The application is wrong**: log a bug (step 7).
- **The design can't be implemented as written**, because it depends on behaviour
  outside the story or contradicts the sub-issue: **escalate to the tech lead**.

### 7) Log bugs

**One sub-issue per defect.** A single issue listing six failures can't be closed
incrementally.

Build the body from `.github/ISSUE_TEMPLATE/sub-issue.md` with a `[Bug]` title prefix.
State:
- the IT code and the scenario name
- what the design says must happen
- what actually happened, including the failing assertion
- how to reproduce it: the `--grep` command and any seeding

```bash
gh issue create --title "[Bug] ..." --label "type: bug" --body-file {path}
```

Add the story's own `layer:` and `context:` labels. If no existing label fits, say so
rather than creating one.

Link the bug to the story with GraphQL (the REST API returns 404 for sub-issues):

```bash
gh api graphql -f query='mutation {
  addSubIssue(input: {issueId: "STORY_ID", subIssueId: "BUG_ID"}) {
    issue { number } subIssue { number }
  }
}'
```

On a later cycle, **close a bug when the spec that found it passes**. Evidence closes
it, not the developer's report.

### 8) Tear down, sign off and report

Run `docker compose --profile qa down -v` once the last run finishes, whatever the
outcome.

Sign off only when every assigned IT code has a passing spec **and** no bug you raised
against the story is still open. Then:

```bash
gh pr edit {pr_number} --add-label "gate: qa-complete"
```

That label is your signature. The tech lead reads it at the merge gate, and it
survives if this session dies before your report is read.

`qa-run-{cycle}.md` must record, per IT code: the scenarios implemented, the spec
file, pass/fail, and the triage decision and reasoning for every failure. It must
also note anything that concerns you even though coverage is complete. The tech lead
can learn that nowhere else.

Reply per `.claude/shared/subagent-contract.md` with one of:

```
VERDICT: SIGNED_OFF
REPORT: {journal_dir}/qa-run-{cycle}.md
IT_CODES: {n}/{n} passing
```

```
VERDICT: BUGS (n)
REPORT: {journal_dir}/qa-run-{cycle}.md
BUGS: #123, #124
IT_CODES: {n}/{m} passing
```

```
VERDICT: NEEDS_RULING (n)
REPORT: {journal_dir}/qa-run-{cycle}.md
```

`BUGS` is an ordinary outcome: it means the testing worked. Never paste test output
into the reply.
