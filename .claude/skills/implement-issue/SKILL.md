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

Use this skill when the user provides:

- `issue_number` (story/sub-issue), e.g. `48`
- `parent_issue_number` (epic/parent), e.g. `45`

Optional but recommended:

- Repository owner/name if not inferable from git remote.

## Goal

Execute the full story workflow for a GitHub issue:
1) prepare the base branch via the prepare-base skill,
2) read and orient from the issue,
3) check dependencies are unblocked,
4) create a correctly named feature branch from the base branch,
5) implement the requirements,
6) verify implementation via the verify-implementation skill,
7) open a PR targeting the base branch.

## Procedure

### 0) Gather inputs

Before doing anything else:

- If `issue_number` was not provided, ask: "What is the issue number to implement?"
- If `parent_issue_number` was not provided, ask: "What is the parent epic issue number?"
- Do not proceed until both values are confirmed.

### 0.5) Prepare base branch

- Invoke the `prepare-base` skill.
- Allow `prepare-base` to ask for and checkout the base branch independently.
- Do not pass or assume a base branch — let the user confirm it within `prepare-base`.
- After `prepare-base` completes, the current branch is the base branch.

### 1) Read and orient

Read issue `#{issue_number}` fully. The issue follows the structure defined
in `.github/ISSUE_TEMPLATE/sub-issue.md`.

Ignore completely:

- `## Post-Implementation Summary`

Extract and internalize the following before writing any code:

- `issue_title`
- `milestone_number` — from the issue milestone (e.g. `M1` → `1`)
- IT codes — from `## Epic Reference > Acceptance Criteria Covered` (e.g. `M1IT1`)
- UC codes — from `## Acceptance Criteria (G/W/T)` (e.g. `M1UC1`)
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

If any requirement is ambiguous or two sections appear to conflict, ask a
clarifying question before coding. Do not resolve ambiguity by assumption.

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
  understanding to the user and ask for confirmation before proceeding.

The goal of this step is to arrive at a clear mental map of where each
requirement will land, without having written a single line yet.

### 3) Create feature branch

- Create feature branch from current HEAD following branch naming conventions
  in `docs/coding-standards.md`.

### 4) Implement

- Implement all functional requirements from `## Functional Requirements`,
  honouring the constraints from `## Context & Constraints`, the boundaries
  from `## Out of Scope`, and the contracts from `## API / Interface Contract`.
- For each UC code: write the corresponding test — one test per UC, named to
  reflect the G/W/T behaviour it verifies.
  - Backend UC codes: xUnit tests tagged `[Trait("AC", "M1UCx")]`
  - Frontend UC codes: vitest service tests (mock fetch, no DOM) in
    `frontend/src/services/__tests__/`. Install vitest if not present
    (`npm install -D vitest`).
- For each IT code: write an xUnit integration test tagged
  `[Trait("AC", "M1ITx")]`.
- If `## Acceptance Criteria (G/W/T)` has no entries, no unit/frontend tests are required for this story. IT code coverage from `## Epic Reference > Acceptance Criteria Covered` is independent of this and still applies if present.
- Update `README.md` if behaviour, setup, usage, or documentation are affected.
- Build: `dotnet build src/PanoramaMusic.sln`
- Format check: `dotnet format src/PanoramaMusic.sln --verify-no-changes`
- Test: `dotnet test src/PanoramaMusic.Tests`
- Run frontend checks (lint, typecheck, vitest) if story has frontend scope.
- Fix all failures before proceeding.

### 5) Verify implementation

- Invoke the `verify-implementation` skill.
- Allow `verify-implementation` to capture the working tree diff, read
  standards, run automated checks, review code, and present its report
  independently.
- After `verify-implementation` completes, the user will have chosen one of:
  - Dismiss report and proceed — move to step 6.
  - Fix specific items — verify re-runs until resolved.
- Do not proceed to step 6 until the verify step is resolved.

### 6) Open PR

- Ask: "Are you ready to post a pull request?"
- If yes: proceed with commit, push, and PR creation.
- If no: stop and wait.
- Commit and format the PR following conventions in `docs/coding-standards.md`.
- Push feature branch.
- Retrieve the milestone title from the issue milestone extracted in step 1.
- Create PR using `gh pr create` with **all** of the following flags explicitly
  set:
  - `--base base_branch`
  - `--title "{issue_title} (#{issue_number})"`
  - `--milestone "{milestone_title}"`
  - `--body` including:
    - brief overview of what changed
    - `Closes #{issue_number}`
    - milestone name as a readable line
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
- Keep communication concise and actionable.