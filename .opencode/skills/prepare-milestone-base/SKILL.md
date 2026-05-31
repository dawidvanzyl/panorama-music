---
name: prepare-milestone-base
description: >
  Load this skill when the user says "prepare milestone base",
  "prepare-milestone-base", or "/prepare-milestone-base". Checks out master,
  pulls latest, and creates and pushes a milestone/m{number} branch derived
  from an epic issue.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: git-branch-management
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **prepare-milestone-base**. Creating milestone branch..."

## Inputs

- `epic_issue_number`: the GitHub issue number of the milestone epic (e.g. `3`).

## Goal

Create a `milestone/m{number}` branch from the latest `master` and push it to
remote, ready for feature branches to be branched from it during the milestone
implementation cycle.

## Guardrails

- **No file edits, no commits.**
- **Refuse to proceed if the working tree is dirty** (uncommitted changes
  present).
- If `milestone/m{number}` already exists on remote, warn and ask the user for
  confirmation before continuing (they may want to sync an existing branch
  rather than creating a duplicate).
- Keep all communication concise and professional. No emojis.

## Procedure

### 0) Gather inputs

- If `epic_issue_number` was not provided, ask: "What is the epic issue number?"
- Do not proceed until the value is confirmed.

### 1) Derive milestone number

- Fetch the epic issue `#{epic_issue_number}` from GitHub.
- Extract the milestone number from the issue title using the pattern
  `[Backlog] M{number} —`.
  For example, `[Backlog] M1 — Identity & Auth` yields milestone number `1`.
- If the pattern does not match, notify the user and ask them to provide the
  milestone number manually.

### 2) Check working tree

- Run `git status --porcelain`.
- If output is not empty, notify the user:
  > "Working tree has uncommitted changes. Please commit or stash them before
  > running this skill."
  and stop. Do not proceed.

### 3) Check if milestone branch already exists

- Check if `milestone/m{number}` exists on remote:
  `git ls-remote --heads origin milestone/m{number}`
- If it exists, notify the user:
  > "Branch milestone/m{number} already exists on remote. Do you want to check
  > it out and pull latest instead of creating from scratch?"
- If the user says yes, skip to step 5 (checkout and pull instead of create).
- If the user says no, stop. Do not proceed.

### 4) Create milestone branch

- `git checkout master`
- `git pull origin master`
- `git checkout -b milestone/m{number}`
- `git push -u origin milestone/m{number}`

### 5) Confirm

- Run `git branch --show-current` to confirm the active branch.
- Run `git ls-remote --heads origin milestone/m{number}` to confirm the branch
  exists remotely.
- Notify the user:
  > "Branch milestone/m{number} is active locally and present on remote. Ready
  > for milestone feature branches."

### 6) Summary

Post a brief summary:
> "Milestone branch **milestone/m{number}** created from **master** and pushed
> to origin. Ready for sub-issue implementation."
