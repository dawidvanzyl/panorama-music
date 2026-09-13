---
name: implement-issue
description: >
  Load this skill when the user says "implement issue", "implement-issue", or
  "/implement-issue". Implements a GitHub story issue end-to-end: prepares base
  branch, creates feature branch, implements the requirements, verifies via the
  verify-implementation skill, and opens a PR.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Inputs

- `issue_number` (story), `parent_issue_number` (epic) — required.
- `mode` — `interactive` (default) or `subagent`.
- `subagent` only, required: `base_branch` (resolved by the caller), `journal_dir`
  (absolute path to the story's journal), `design_file` (the frozen `e2e-design.md`
  from `qa-design`).
- Optional: repository owner/name if not inferable from the git remote.

## Asking vs escalating

Wherever this skill says **raise it**: in `interactive` mode ask the user; in
`subagent` mode escalate to the tech lead — stating the question, the options you
see and which you'd choose — then continue with anything that doesn't depend on the
answer. Never ask a question in `subagent` mode: a background worker has no turn for
the answer to land in, so a question is a hang, not a pause. Never resolve ambiguity
by assumption in either mode.

## Procedure

### 0) Gather inputs

- `interactive` — ask for any missing `issue_number` / `parent_issue_number`, and
  wait until both are confirmed.
- `subagent` — a missing required input is `BLOCKED (1)` naming it.

### 0.5) Prepare base branch

Invoke `prepare-base` with `base_branch` and `mode`. In `interactive` mode, let it ask
for the base branch if the user hasn't named one; in `subagent` mode pass yours — the
derivation rule lives in one place so it cannot drift.

If it returns `BLOCKED`, stop and pass it through. A dirty working tree is the common
cause and may hold **your own uncommitted work from a run that died mid-story** —
never resolve it yourself.

Afterwards `origin/{base_branch}` is fetched and current. The local branch may not be
`base_branch` (another worktree may have it checked out); that is expected, since
step 3 branches from the remote ref.

### 1) Read and orient

Read issue `#{issue_number}` in full (structure: `.github/ISSUE_TEMPLATE/sub-issue.md`),
ignoring any `## Post-Implementation Summary`. Extract:

- `issue_title`
- `milestone_title` — from the assigned milestone, if any (`[Bug]` / `[Tech Debt]`
  issues usually have none).
- IT codes (`## Test Specifications`, e.g. `45IT1`) — what QA will prove against your
  branch.
- UC codes (`## Acceptance Criteria (G/W/T)`, e.g. `48UC1`).
- `## Context & Constraints` — patterns and restrictions you may not deviate from
  without raising it first.
- `## Functional Requirements` — your implementation checklist.
- `## Domain & Data` — entities, fields and business rules.
- `## API / Interface Contract` — the agreed contract; do not alter it.
- `## Out of Scope` — a hard boundary; implement nothing listed.
- `## Notes`, if present, last — edge cases, security considerations and deliberate
  deferrals that must not be overridden.

Also read `docs/coding-standards.md`, plus for backend scope
`docs/coding-standards-backend.md` and `src/.editorconfig`, and for frontend scope
`docs/coding-standards-frontend.md` and `frontend/.editorconfig`.

Then read `design_file`: the preconditions, actors, paths and outcomes QA will assert,
written before the build. Build to it — satisfying a requirement differently from the
design is a bug report waiting to be filed. It is **read-only**; if it looks wrong
(contradicts the issue, or asserts out-of-scope behaviour), raise it.

Raise any ambiguity or conflict between sections before coding.

### 1.5) Dependency gate (hard stop)

For every blocking reference in `## Context & Constraints` (`Depends on #X` or
similar), check the issue's state. If any is not closed, stop with "Blocked
dependency detected: #X is not closed. Implementation cannot proceed." — no branch,
code or verification.

### 2) Orient in the codebase

Before writing code, map each requirement to where it will land: find the directories
for each layer named in the constraints, read 2–3 representative files for the
patterns to follow, and for `layer: frontend` stories match `## Page Architecture` to
existing component patterns. If the structure is unclear or nothing analogous exists,
state your understanding and raise it for confirmation.

### 3) Create feature branch

Prefix from labels: `type: feature` → `feature/`, `type: bug` → `bug/`,
`type: tech-debt` → `tech-debt/`. Slug per `docs/coding-standards.md` (kebab-case from
the title, max 5 words, no milestone number).

```
git checkout -b {prefix}/{issue_number}-{slug} origin/{base_branch}
```

Always branch from `origin/{base_branch}`, never HEAD — a local copy may be stale or
absent.

### 4) Implement

Create `{journal_dir}/implement-{attempt}.md` with a `## Progress` heading before
writing code, and append a line after each unit of work. Record what you built, verify
cycles and dispositions, and every decision the issue didn't settle — a later attempt,
possibly a fresh agent after this session dies, reads it to avoid repeating a failed
approach.

**Commit after each layer** — domain, application, infrastructure, API, frontend,
tests (conventions in `docs/coding-standards.md`). Uncommitted work in a dead session
is redone from scratch, and the PR is squash-merged, so a granular trail costs
nothing.

- Implement every functional requirement within the constraints, contract and
  scope boundary.
- One test per UC code, named for the G/W/T behaviour it verifies:
  - backend — xUnit, `[Trait("AC", "{code}")]` with the exact code (e.g. `48UC1`)
  - frontend — vitest service tests (mock fetch, no DOM) in
    `frontend/src/services/__tests__/`; install vitest if absent
    (`npm install -D vitest`); register any new tag (name + description) in the
    `tags` array of `frontend/vitest.config.ts`.
- An empty `## Acceptance Criteria (G/W/T)` means no unit tests — a valid state; IT
  coverage is independent and QA's to prove.
- **No tests for IT codes, and never tag a unit test with one.** IT codes are proven
  only by QA's Playwright specs. A unit test with an IT trait makes a code look
  covered to `close-issue` and `close-milestone` while proving something narrower —
  a false green, worse than no coverage. The path guard refuses writes in `e2e/`;
  that is the boundary. If an IT code describes behaviour the story cannot deliver,
  raise it.
- Update `README.md` if behaviour, setup or usage changed.
- Run and fix until clean: `dotnet build src/PanoramaMusic.slnx`,
  `dotnet format src/PanoramaMusic.slnx --verify-no-changes`,
  `dotnet test src/PanoramaMusic.Tests`, and for frontend scope lint, typecheck and
  vitest.

### 5) Verify (gauntlet loop, max 3 cycles)

Commit, then run up to three cycles. `implement-issue` owns the count;
`verify-implementation` is stateless. Each cycle, invoke `verify-implementation` in a
sub-agent with `issue_number`, `base_branch`, `journal_dir`, `mode: subagent`,
`cycle`, and from cycle 2: `prev_verify_sha` (previous `VERIFIED_SHA`) and
`prev_report` — the **path** to the previous `{journal_dir}/verify-{cycle}.md`,
annotated with your disposition on every finding. Verify returns only a verdict
block; read the report file yourself.

**Every finding gets a disposition** — blockers, warnings, suggestions and questions
alike. "Advisory" means the verdict doesn't gate on it, not that it can be skipped:

- `ACTIONED: {what you did}` — fixed and committed.
- `INVALID: {reason}` — citing the issue, codebase or a standards doc; verify
  adjudicates next cycle. Never mark something invalid to avoid work.
- `DEFERRED: {reason}` — non-blockers only, valid but genuinely out of scope; raise
  it at step 6. Do not open a tracking issue.

Verdicts:

- **`PASS`** — once every finding is dispositioned, go to step 6.
- **`BLOCKED (n)`** — action or invalidate each blocker, then run the next cycle.
- **`NEEDS_RULING (n)`** — raise the questions and disputed findings (in
  `subagent` mode the tech lead may answer from the epic, standards or an earlier
  ruling). Record the outcome as `RESOLVED_BY: developer`, apply any fix, resume.
  Settled items are never re-raised.

If cycle 3 is not `PASS`, stop and hand the outstanding report to the developer.

### 6) Open PR

- `interactive` — ask "Are you ready to post a pull request?" and wait for yes.
- `subagent` — proceed: the PR is the assigned outcome, not a commitment to merge;
  three gate labels and the lead's judgement still stand before the milestone
  branch.

**Re-entering after rework** (a PR already exists): before pushing, strip the worker
gates:

```bash
gh pr edit {pr_number} --remove-label "gate: qa-complete" --remove-label "gate: reviewer-approved"
```

They describe code that stops existing when you push; leaving one would let the story
merge on a sign-off given against different code. Leave `gate: owner-approved` — it
is the owner's.

Push, then `gh pr create` per `docs/coding-standards.md`, setting everything at
creation (don't rely on later edits):

- `--base {base_branch}`
- `--title "{issue_title} (#{issue_number})"`
- `--milestone "{milestone_title}"` — omit entirely if none; never invent one
- `--body` — brief overview, `Closes #{issue_number}`, and the milestone name as a
  readable line if assigned

## Guardrails

- No force push, history rewriting or amending unless explicitly requested.
- Preserve unrelated local changes in the working tree.
- Never assume missing information — raise it.
- Keep communication concise and actionable.

## Reporting (`subagent` mode)

Per `.claude/shared/subagent-contract.md`, reply with only:

```
VERDICT: {PR_OPEN | BLOCKED (n) | NEEDS_RULING (n)}
REPORT: {journal_dir}/implement-{attempt}.md
PR: {pr_number}
SHA: {sha}
```

Never paste a diff, verify report or test output into the reply.
