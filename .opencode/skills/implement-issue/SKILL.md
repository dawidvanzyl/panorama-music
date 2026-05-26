---
name: implement-issue
description: >
  Load this skill when the user says "implement issue", "implement-issue", or
  "/implement-issue". Implements a GitHub story issue end-to-end: prepares base
  branch, creates feature branch, implements the plan, and opens a PR.
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
4) update acceptance criteria checkboxes as items pass,
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
  - acceptance criteria checklist items
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
- Update `README.md` if behavior/setup/usage/docs are affected.
- Run relevant tests/checks/build for changed scope.
- Fix issues until checks pass.

### 4) Update acceptance criteria in story issue

- As each acceptance criterion is validated, update the checkbox in issue `#{issue_number}` immediately (do not wait until the end).
- Keep issue text truthful and current.

### 5) Open PR

- Commit using project conventions.
- Push feature branch.
- Create PR with:
  - base: `base_branch` (captured in step 2)
  - head: feature branch
  - title: `{issue_title} (#{issue_number})`
  - body includes:
    - brief overview of what changed
    - `Closes #{issue_number}` (or equivalent issue reference)
    - milestone reference (explicit line naming the milestone)
- Ensure PR references milestone and sub-issue.

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
