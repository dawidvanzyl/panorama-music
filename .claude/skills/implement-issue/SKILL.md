---
name: implement-issue
description: >
  Load this skill when the user says "implement issue", "implement-issue", or
  "/implement-issue". Implements a GitHub story issue end-to-end: prepares base
  branch, creates feature branch, implements the requirements, verifies via the
  verify-implementation skill, and opens a PR.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **implement-issue**. Starting workflow..."

## Inputs

- `issue_number` (story/sub-issue), e.g. `48` — required.
- `parent_issue_number` (epic/parent), e.g. `45` — required.
- `mode` — `interactive` (default) or `subagent`.

Required in `subagent` mode:

- `base_branch` — resolved by the caller. Never asked for here.
- `journal_dir` — absolute path to this story's journal directory.
- `design_file` — the frozen `e2e-design.md` from `qa-design`. Read-only.

Optional but recommended:

- Repository owner/name if not inferable from git remote.

## Goal

Execute the full story workflow for a GitHub issue:
1) prepare the base branch via the prepare-base skill,
2) read and orient from the issue and the E2E scenario design,
3) check dependencies are unblocked,
4) create a correctly named feature branch from the base branch,
5) implement the requirements,
6) verify implementation via the verify-implementation skill,
7) open a PR targeting the base branch.

## Procedure

### 0) Gather inputs

Before doing anything else:

`interactive`:

- If `issue_number` was not provided, ask: "What is the issue number to implement?"
- If `parent_issue_number` was not provided, ask: "What is the parent epic issue number?"
- Do not proceed until both values are confirmed.

`subagent`:

- Every required input arrives in the brief. If one is missing, do not guess and do
  not ask — report `BLOCKED (1)` naming it. A question here is a hang, not a pause.

### 0.5) Prepare base branch

- Invoke the `prepare-base` skill, passing `base_branch` and the current `mode`.
- `interactive` — if the user has not named a base branch, let `prepare-base` ask.
- `subagent` — pass the `base_branch` from your brief. `prepare-base` will not ask
  for it, and must not: the derivation rule lives in one place so it cannot drift.
- If `prepare-base` returns `BLOCKED`, stop and pass that through. A dirty working
  tree is the common cause, and it may hold **your own uncommitted work from a run
  that died mid-story** — never resolve it yourself.
- After `prepare-base` completes, `origin/{base_branch}` has been fetched and
  is current. The current local branch may or may not be `base_branch` itself
  (if another worktree already had it checked out, `prepare-base` will have
  stayed on the prior branch and relied on the fetched remote ref instead —
  this is expected and does not block the next step).

### 1) Read and orient

Read issue `#{issue_number}` fully. The issue follows the structure defined
in `.github/ISSUE_TEMPLATE/sub-issue.md`.

Ignore completely:

- `## Post-Implementation Summary`

Extract and internalize the following before writing any code:

- `issue_title`
- `milestone_title` — from the issue's assigned GitHub milestone, if any.
  Used only for the PR `--milestone` flag in step 6; omit that flag entirely
  if the issue has no milestone assigned (expected for `[Bug]` and
  `[Tech Debt]` issues).
- IT codes — from `## Test Specifications` (e.g. `45IT1`). Read them to understand
  what will be proven against your branch; never write a test for one.
- UC codes — from `## Acceptance Criteria (G/W/T)` (e.g. `48UC1`)
- **Constraints** — read `## Context & Constraints` in full. Note every
  pattern, convention, and restriction listed. These are non-negotiable during
  implementation; do not deviate without raising it with the user first.
- **Functional requirements** — read `## Functional Requirements`. These are
  the observable behaviours the implementation must deliver. Use them as the
  primary implementation checklist.
- **Domain & Data** — read `## Domain & Data`. Understand the entities, their
  relevant fields, and the business rules before touching any domain code.
- **API / Interface Contract** — read `## API / Interface Contract`. The
  endpoint signatures, payloads, and error cases described here are the agreed
  contract. Do not alter them during implementation.
- **Out of Scope** — read `## Out of Scope`. This is a hard implementation
  boundary alongside Functional Requirements; do not implement anything listed
  here.
- **Notes** — read `## Notes` last, if present. This section contains edge
  cases, security considerations, and deliberate deferrals that must not be
  missed or overridden.
- `docs/coding-standards.md` — git, commit, and PR conventions.
- `docs/coding-standards-backend.md` — if any backend scope is detected in
  the issue labels or content.
- `docs/coding-standards-frontend.md` — if any frontend scope is detected in
  the issue labels or content.
- `src/.editorconfig` — if backend scope.
- `frontend/.editorconfig` — if frontend scope.

Then read `design_file` — the frozen E2E scenario design for this story.

It is the most concrete statement of what this story must do that exists: the
preconditions, actors, paths and expected outcomes that the acceptance tests will
prove, written before any of it was built. Build to it. Every scenario in it is
something QA will assert against your branch, so a requirement you satisfy
differently from the design is a bug report waiting to be filed.

The design is **read-only**. If it appears wrong — it contradicts the sub-issue, or
asserts behaviour the story places out of scope — that is a real possibility worth
raising, and it is an escalation, never an edit.

If any requirement is ambiguous or two sections appear to conflict:

- `interactive` — ask a clarifying question before coding.
- `subagent` — escalate to the tech lead, stating the conflict, the options you see
  and which you would choose. Then continue with anything that does not depend on
  the answer.

Do not resolve ambiguity by assumption in either mode.

### 1.5) Dependency gate (HARD STOP)

Check `## Context & Constraints` for any `Related issues: Depends on #X` (or similarly phrased blocking references).

For every such dependency, check the issue's status.

If ANY blocked issue is not closed:

- Stop immediately.
- Output: "Blocked dependency detected: #X is not closed. Implementation cannot proceed."
- Do not load standards, create a branch, write code, or run verification.

### 2) Orient in the codebase

Before writing any code, explore the existing codebase to understand how to
map the issue's requirements to actual files and structure:

- Locate the layer boundaries described in `## Context & Constraints` — find
  the existing directories and files that correspond to each layer.
- Identify the patterns to follow (service classes, middleware, naming
  conventions) by reading 2–3 representative existing files in the relevant
  areas.
- For stories with `layer: frontend`: read `## Page Architecture` and identify
  existing component patterns the new screens should follow.
- If the codebase structure is unclear or no analogous code exists, state your
  understanding and get it confirmed before proceeding — to the user in
  `interactive` mode, to the tech lead in `subagent` mode.

The goal of this step is to arrive at a clear mental map of where each
requirement will land, without having written a single line yet.

### 3) Create feature branch

- Determine the branch prefix from the issue's labels: `type: feature` →
  `feature/`, `type: bug` → `bug/`, `type: tech-debt` → `tech-debt/`.
- Create branch `{prefix}/{issue_number}-{slug}` from `origin/{base_branch}`
  (`git checkout -b {prefix}/{issue_number}-{slug} origin/{base_branch}`),
  never from current HEAD — this keeps the branch point correct even when
  another worktree's local copy of `base_branch` is stale or the branch
  wasn't checked out locally in step 0.5. Slug per the rule in
  `docs/coding-standards.md` (kebab-case, derived from the issue title, max 5
  words). No milestone number in the branch name.

### 4) Implement

**Before writing code**, create `{journal_dir}/implement-{attempt}.md` with a
`## Progress` heading. Append a line after each unit of work below.

**Commit after each layer** — domain, application, infrastructure, API, frontend,
tests — never once at the end. Conventions in `docs/coding-standards.md`.

Uncommitted work in a dead session is redone from scratch. The PR is squash-merged,
so a granular trail costs nothing.

- Implement all functional requirements from `## Functional Requirements`,
  honouring the constraints from `## Context & Constraints`, the boundaries
  from `## Out of Scope`, and the contracts from `## API / Interface Contract`.
- For each UC code: write the corresponding test — one test per UC, named to
  reflect the G/W/T behaviour it verifies.
  - Backend UC codes: xUnit tests tagged `[Trait("AC", "{code}")]` using the
    exact code as it appears in the issue body (e.g. `[Trait("AC", "48UC1")]`).
  - Frontend UC codes: vitest service tests (mock fetch, no DOM) in
    `frontend/src/services/__tests__/`. Install vitest if not present
    (`npm install -D vitest`). Register any new tag in `frontend/vitest.config.ts`'s
    `tags` array (name + description), same as every existing tag.
- **Write no tests for IT codes.** IT codes are proven by Playwright specs and
  nothing else, and those specs belong to QA — they are designed before you start
  and implemented after you open the PR.

  Never tag an xUnit or vitest test with an IT code. A unit test carrying an IT
  trait makes a code look covered to `close-issue` and `close-milestone` while
  proving something narrower than the end-to-end behaviour the code names, which
  is worse than no coverage: it is a false claim that reports as green.

  You cannot write in `e2e/` — the path guard refuses it. That is the boundary, not
  an obstacle. If an IT code describes behaviour you believe the story cannot
  deliver, escalate.

- If `## Acceptance Criteria (G/W/T)` has no entries, no unit or frontend tests are
  required for this story. That is a valid state, not a gap — the story's IT
  coverage is independent of it and is QA's to prove.
- Update `README.md` if behaviour, setup, usage, or documentation are affected.
- Build: `dotnet build src/PanoramaMusic.slnx`
- Format check: `dotnet format src/PanoramaMusic.slnx --verify-no-changes`
- Test: `dotnet test src/PanoramaMusic.Tests`
- Run frontend checks (lint, typecheck, vitest) if story has frontend scope.
- Fix all failures before proceeding.

### 5) Verify implementation (gauntlet loop)

Commit your work before verifying. Then run up to **3** verify cycles.

For each cycle, invoke `verify-implementation` in a sub-agent, passing:

- `issue_number`
- `base_branch`
- `journal_dir`
- `mode: subagent`
- `cycle` — 1, 2, or 3
- `prev_verify_sha` — the `VERIFIED_SHA` from the previous cycle (omit on
  cycle 1)
- `prev_report` — the **path** to the previous cycle's report, annotated with your
  disposition on every finding (omit on cycle 1). Verify writes its report to
  `{journal_dir}/verify-{cycle}.md` and returns only a verdict block; read the file
  yourself, and pass the path rather than its contents.

Act on the verdict:

- **`PASS`** — every non-gating finding still has a disposition (see below).
  Once they do, proceed to step 6.
- **`BLOCKED (n)`** — for each blocker, either fix it and commit, or mark it
  invalid with a reason. Carry both into the next cycle's `prev_report` — fixed
  items so verify can confirm them, invalid items annotated
  `INVALID: {reason}` so verify can adjudicate. Do not mark an item invalid to
  avoid work; the reason must cite the issue, the codebase, or a standards doc.
- **`NEEDS_RULING (n)`** — stop and get a ruling on the open questions and
  disputed findings.
  - `interactive` — present them to the developer.
  - `subagent` — escalate to the tech lead, which may answer from the epic, the
    standards docs or a ruling already recorded earlier in the run, or take it to
    the developer itself.

  Once ruled, record the decision as `RESOLVED_BY: developer` in `prev_report`,
  apply any required fix, and resume the loop. Settled items are never re-raised —
  in this cycle or any later one.

**Non-gating findings.** Warnings, suggestions, and questions do not block the
verdict, but they are never ignored. On every cycle, give each one an explicit
disposition and record it in the next cycle's `prev_report`:

- Valid and in scope → fix it and commit. Annotate `ACTIONED: {what you did}`.
- Valid but genuinely out of scope for this issue → annotate
  `DEFERRED: {reason}` and raise it with the developer at step 6 rather than
  silently dropping it. Per project policy, do not open a tracking issue.
- Not valid → annotate `INVALID: {reason}`, citing the issue, the codebase, or
  a standards doc. Verify adjudicates it on the next cycle, same as a blocker.

Never proceed to step 6 with an undispositioned warning, suggestion, or
question. "Advisory" means the verdict does not gate on it — not that it can be
skipped.

If cycle 3 does not return `PASS`, stop and hand the outstanding report to the
developer. Do not proceed to step 6.

### 6) Open PR

- `interactive` — ask: "Are you ready to post a pull request?" If yes, proceed. If
  no, stop and wait.
- `subagent` — proceed without asking. Opening the PR is the outcome the tech lead
  assigned; a gate here would stall the run, and the PR is not a commitment to merge
  — three labels and the lead's own judgement still stand between it and the
  milestone branch.
- Commit and format the PR following conventions in `docs/coding-standards.md`.

**If a pull request already exists for this branch** — you are re-entering after
rework — strip the worker gate labels before pushing:

```bash
gh pr edit {pr_number} --remove-label "gate: qa-complete" --remove-label "gate: reviewer-approved"
```

Those labels describe a branch that stops existing the moment you push. Leaving one
in place would let the story merge on a sign-off given against different code, which
is the one path by which this pipeline could ship something nobody checked. Leave
`gate: owner-approved` alone — that one is the owner's to manage.

- Push feature branch.
- Use `milestone_title` extracted in step 1, if any.
- Create PR using `gh pr create` with:
  - `--base base_branch`
  - `--title "{issue_title} (#{issue_number})"`
  - `--milestone "{milestone_title}"` — **omit this flag entirely** if the
    issue has no milestone assigned (expected for `[Bug]`/`[Tech Debt]`
    issues). Never invent a milestone.
  - `--body` including:
    - brief overview of what changed
    - `Closes #{issue_number}`
    - milestone name as a readable line, if one is assigned
- Do not rely on post-creation edits — set milestone and issue reference at
  creation time.

## Guardrails

- Never proceed if dependencies are blocked.
- Do not use force push or destructive git history commands unless explicitly
  requested.
- Do not amend commits unless explicitly requested.
- Preserve unrelated local changes in working tree.
- Do not deviate from patterns or constraints listed in `## Context &
  Constraints` without raising it with the user first.
- Never implement outside `## Functional Requirements` / `## Out of Scope`.
- Never assume missing information.
- The verify loop is capped at 3 cycles. `implement-issue` owns the count;
  `verify-implementation` is stateless.
- Never dismiss a verify finding silently — blocker or not. Fix it, or annotate
  it `INVALID`/`DEFERRED` with a cited reason and let verify adjudicate.
- Never write in `e2e/`, and never tag a unit test with an IT code.
- Never edit `design_file`.
- Never ask a question in `subagent` mode. A background worker has no interactive
  turn for an answer to land in, so a question is a hang rather than a pause —
  escalate to the tech lead instead, and carry on with anything that does not
  depend on the answer.
- Keep communication concise and actionable.

## Reporting (`subagent` mode)

Per `.claude/shared/subagent-contract.md`, reply with a verdict block only:

```
VERDICT: {PR_OPEN | BLOCKED (n) | NEEDS_RULING (n)}
REPORT: {journal_dir}/implement-{attempt}.md
PR: {pr_number}
SHA: {sha}
```

Write the report into `journal_dir` **as you go**. Record what you built, the
verify cycles and their dispositions, and every decision you made that the issue did
not settle. A later attempt — possibly by a fresh agent after this session dies —
reads that file to avoid repeating an approach that already failed.

Never paste a diff, a verify report, or test output into the reply.