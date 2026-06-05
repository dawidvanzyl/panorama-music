---
name: implement-issue
description: >
  Load this skill when the user says "implement issue", "implement-issue", or
  "/implement-issue". Implements a GitHub story issue end-to-end: prepares base
  branch, creates feature branch, implements the plan, verifies via the
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

- repository owner/name if not inferable from git remote.

## Goal

Execute the full story workflow for a GitHub issue:
1) prepare the base branch via the prepare-base skill,
2) read and implement the issue,
3) create a correctly named feature branch from the base branch,
4) verify implementation via the verify-implementation skill,
5) open a PR targeting the base branch.

## Required Conventions

- Branch name: `feature/M{milestone_number}-{issue_number}-{slug}`
- PR title: `{issue_title} (#{issue_number})`
- PR must reference:
  - sub-issue `#{issue_number}`
  - milestone
- PR body: concise overview of what changed
- README must be updated when needed by the story.

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

### 1) Read and plan

- Read issue `#{issue_number}` fully (description, acceptance criteria, milestone, labels, linked items).
- If requirements are ambiguous or conflicting, ask clarifying question(s) before coding.
- Extract:
  - `issue_title`
  - IT codes from `## Epic Reference > Acceptance Criteria` (e.g. `M1IT1`)
  - UC codes from `## Acceptance Criteria (G/W/T)` (e.g. `M1UC1`)
  - milestone number (`milestone_number`) from issue milestone (e.g. `M0` -> `0`).

### 2) Capture base branch and create feature branch

- Capture current branch via `git branch --show-current`; save as `base_branch`.
- Create feature branch from current HEAD using:
  - `feature/M{milestone_number}-{issue_number}-{slug}`
- `slug` rules:
  - derived from `issue_title`
  - lowercase
  - alphanumeric + hyphens only
  - collapse repeated separators.

### 3) Implement

- Implement story requirements in codebase.
- For backend UC codes: write xUnit tests tagged with `[Trait("AC", "M1UCx")]`.
- For frontend UC codes: write vitest service tests (mock fetch, no DOM) in
  `frontend/src/services/__tests__/`. Install vitest if not present
  (`npm install -D vitest`).
- For IT codes: write xUnit integration tests tagged with `[Trait("AC", "M1ITx")]`.
- Update `README.md` if behavior/setup/usage/docs are affected.
- Build: `dotnet build src/PanoramaMusic.sln`
- Format check: `dotnet format src/PanoramaMusic.sln --verify-no-changes`
- Test: `dotnet test src/PanoramaMusic.Tests`
- Run any frontend checks (lint, typecheck, vitest) if frontend scope
- Fix issues until all steps pass.

### 4) Verify implementation

- Invoke the `verify-implementation` skill.
- Allow `verify-implementation` to capture the working tree diff, read standards, run automated checks, review code, and present its report independently.
- After `verify-implementation` completes, the user will have chosen one of:
  - dismiss report and proceed — move to step 5
  - fix specific items — verify re-runs until resolved
- Do not proceed to step 5 until the verify step is resolved.

### 5) Open PR

- Ask: "Are you ready to post a pull request?"
- If yes: proceed with commit, push, and PR creation.
- If no: stop and wait.
- Commit using project conventions.
- Push feature branch.
- Retrieve the milestone title from the issue milestone extracted in step 1.
- Create PR using `gh pr create` with **all** of the following flags explicitly set:
  - `--base base_branch`
  - `--title "{issue_title} (#{issue_number})"`
  - `--milestone "{milestone_title}"`
  - `--body` including:
    - brief overview of what changed
    - `Closes #{issue_number}` (this links the issue in the Development section)
    - milestone name as a readable line
- Do not rely on post-creation edits — set milestone and issue reference at creation time.

### 6) Run PR autopilot

- Retrieve the PR number from the PR created in step 5.
- Run the `/pr-autopilot` command with:
  - `$1` = PR number from step 5
  - `$2` = `issue_number` from step 0
- This will:
  - watch the PR for review comments and resolve them in batched passes,
  - close the story issue once the PR is merged or closed,
  - update the Epic Reference checkbox in the parent issue.

## Guardrails

- Do not use force push or destructive git history commands unless explicitly requested.
- Do not amend commits unless explicitly requested.
- Preserve unrelated local changes in working tree.
- Keep communication concise and actionable.
