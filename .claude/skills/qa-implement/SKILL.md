---
name: qa-implement
description: >
  Load this skill when the user says "qa implement", "qa-implement", or
  "/qa-implement", or when the tech lead assigns E2E spec implementation for a
  story. Implements Playwright specs against a story's frozen scenario design, runs
  them, logs failures as bug sub-issues, and signs off testing. Never fixes
  application code.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

# Announcement

> Loaded skill: **qa-implement**. Implementing E2E specs for #{issue_number}
> (cycle {cycle})...

---

## Goal

Turn a frozen scenario design into Playwright specs, run them against the story's
branch, and report honestly what holds and what does not.

What you sign off is **testing** — that every IT code assigned to this story is now
proven by a passing spec. Whether the story is *done* is the tech lead's decision,
made from your sign-off, the reviewer's approval and the owner's. Report; do not
conclude.

## The design adjudicates

You did not write the scenario design and you do not revise it. When a spec fails,
the design is what decides whose fault it is:

- The spec asserts what the design says, and the application does something else
  → **the application is wrong.** Log a bug.
- The spec asserts something the design did not say → **your spec is wrong.** Fix
  your spec.

That rule is the entire reason the design is frozen before implementation. Without
it, every failure is arguable, and the cheapest way to end an argument is to weaken
an assertion until it passes. A suite that is green because it was adjusted to be
green proves nothing at all.

## Inputs

- `issue_number` — required.
- `journal_dir` — required. Absolute path to this story's journal directory.
- `design_file` — required. The frozen `e2e-design.md`. Read-only to you.
- `base_branch` — required in `subagent` mode. Never inferred; stories branch from
  and merge into the milestone branch.
- `pr_number` — the story's open pull request.
- `cycle` — integer, default `1`. Cycle 1 writes the specs; later cycles re-run
  them after the developer has fixed something.
- `mode` — `interactive` (default) or `subagent`.

If `issue_number` is not available, ask: "What is the issue number to test?" Do not
proceed until confirmed.

---

## Procedure

### 1) Get the branch

```bash
git fetch origin
gh pr checkout {pr_number}
```

Confirm you are on the story's branch and it is up to date with origin. A spec run
against a stale checkout produces findings about code the developer already changed,
which costs a full round trip to discover.

### 2) Read before writing

- `design_file` — the scenarios. This is your specification.
- The issue's `## Test Specifications` — the IT codes. The design should cover all
  of them; if it does not, that gap was already recorded under `## Uncovered` and is
  not yours to fill.
- `e2e/fixtures/` and `e2e/pages/` — what already exists. Reuse it.
- A comparable spec under `e2e/features/` — for shape and grain.

On cycle 2+, also read your own previous run report in `journal_dir` and the bug
sub-issues you opened. Do not re-derive from scratch.

### 3) Bring up the stack

```bash
curl --silent --fail http://localhost:3000/api/health
```

If that fails:

```bash
RESET_DB=true docker compose --profile qa up --build -d
```

Wait for health before running anything. Leave the stack up when you finish — the
developer and the next cycle both benefit, and CI runs its own.

### 4) Implement the specs

One `test.describe` per IT code, tagged with the code:

```ts
test.describe('Course enrolment — admin enrols a student', { tag: ['@45IT1'] }, () => {
```

The tag is how `close-issue` and `close-milestone` find the proof for a code. A spec
that proves the behaviour but carries the wrong tag, or none, is invisible to both.

Within the describe, one `test` per scenario in the design, named after it.

Rules:

- **Follow the existing conventions.** Page objects in `e2e/pages/`, fixtures in
  `e2e/fixtures/`. Add to them rather than inlining a parallel style.
- **Selectors are yours.** The design deliberately stops short of them. Prefer
  semantic, stable locators over structural ones.
- **Honour the isolation marking.** A scenario marked parallel-safe must seed its own
  data and must not depend on the absence of other data — see the unique-value
  helpers in `e2e/features/courses/course-management.spec.ts` for how this suite
  handles that.
- **A missing `data-testid` is a bug, not a licence.** You cannot edit `src/` or
  `frontend/` — the path guard will refuse. If the application exposes no stable way
  to assert something the design requires, log it as a bug like any other finding.

### 5) Run

Per code, so a failure is attributable:

```bash
cd e2e && npx playwright test --grep "@{IT_CODE}"
```

Run every code assigned to the story, including ones that passed on an earlier
cycle. A fix elsewhere in the branch can break a spec that was previously green, and
that regression is exactly what a re-run is for.

### 6) Triage every failure

Apply the adjudication rule above, and record the decision for each failure — not
just the outcome. On cycle 2+ your previous reasoning is what stops the same failure
being re-litigated from scratch.

Three outcomes:

- **Your spec is wrong** — fix it. That is your code and no bug is warranted.
- **The application is wrong** — log a bug (step 7).
- **The design cannot be implemented as written** — it depends on behaviour outside
  the story, or contradicts the sub-issue. This is a real finding. **Escalate to the
  tech lead**; do not weaken the scenario to make it pass.

Never resolve a failure by deleting a test, skipping it, marking it `fixme`, or
loosening an assertion to something that cannot fail.

### 7) Log bugs

**One sub-issue per defect.** A single issue listing six unrelated failures cannot be
closed incrementally and leaves the developer no way to report partial progress.

Build the body from `.github/ISSUE_TEMPLATE/sub-issue.md` with the title prefixed
`[Bug]`, and state:

- The IT code and the scenario name from the design.
- What the design says must happen.
- What actually happened, including the assertion that failed.
- How to reproduce: the `--grep` invocation and any seeding involved.

```bash
gh issue create --title "[Bug] ..." --label "type: bug" --body-file {path}
```

Add the story's own `layer:` and `context:` labels. Never create a label that does
not exist — if none fits, say so rather than inventing one.

Link the bug to the story as a GitHub sub-issue:

```bash
gh api graphql -f query='mutation {
  addSubIssue(input: {issueId: "STORY_ID", subIssueId: "BUG_ID"}) {
    issue { number } subIssue { number }
  }
}'
```

(The REST API returns 404 for sub-issue linking; GraphQL is the only working route.)

On a later cycle, **close a bug when the spec that found it passes**. Evidence closes
it, not the developer's report that it was fixed.

### 8) Commit the specs

Commit to the story's branch, even when specs are failing.

Failing specs on a pull request with open bug sub-issues is the honest state: the
story is not done, `gate: qa-complete` is absent, and nothing can merge. Withholding
them would leave the developer unable to reproduce what you found, which is the one
thing they need most.

Follow the commit conventions in `docs/coding-standards.md`.

### 9) Sign off testing

Sign off only when **both** hold:

- Every IT code assigned to the story has a passing spec.
- No bug sub-issue you raised against this story is still open.

Then, and only then:

```bash
gh pr edit {pr_number} --add-label "gate: qa-complete"
```

That label is your signature. It is what the tech lead reads at the merge gate, and
it is what survives if this session dies before your report is read.

Do not merge, do not approve the pull request, and do not close the story issue —
none of those are yours. If coverage is complete but something still concerns you,
put it in the report; that is exactly the kind of thing the tech lead needs and can
get nowhere else.

### 10) Report

Write the run report into `journal_dir` **as you go**, not at the end:

```
{journal_dir}/qa-run-{cycle}.md
```

Per IT code: the scenarios implemented, the spec file, pass/fail, and for each
failure the triage decision and its reasoning.

Then reply per `.claude/shared/subagent-contract.md`:

```
VERDICT: SIGNED_OFF
REPORT: {journal_dir}/qa-run-{cycle}.md
IT_CODES: {n}/{n} passing
```

or

```
VERDICT: BUGS (n)
REPORT: {journal_dir}/qa-run-{cycle}.md
BUGS: #123, #124
IT_CODES: {n}/{m} passing
```

or

```
VERDICT: NEEDS_RULING (n)
REPORT: {journal_dir}/qa-run-{cycle}.md
```

`BUGS` is an ordinary outcome, not a failure. It means the testing worked.

Never paste test output into the reply.

---

## Guardrails

- Never edit `src/` or `frontend/`. The path guard refuses it; do not route around it
  with a shell command.
- Never revise `design_file`.
- Never weaken, skip or delete a spec to resolve a failure.
- Never sign off with a failing code or an open bug you raised.
- Never merge, approve, or close the story issue.
- Never invent an IT code or a GitHub label.
- One bug sub-issue per defect.
