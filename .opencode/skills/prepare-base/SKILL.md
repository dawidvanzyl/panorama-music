---
name: prepare-base
description: >
  Load this skill when the user says "prepare base", "prepare-base", or
  "/prepare-base". Prunes remote tracking references, checks out a base branch,
  pulls latest, and cleans up local-only feature branches after confirmation.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: git-branch-management
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **prepare-base**. Preparing base branch..."

## Inputs

- `base_branch`: prefer to infer from context if specified by the user.
- If not provided, ask: "Which base branch would you like to prepare? (e.g. master)"

## Procedure

### 0) Gather inputs

- If `base_branch` was not provided, ask: "Which base branch would you like to prepare? (e.g. master)"
- Do not proceed until `base_branch` is confirmed.

### 1) Prune remote tracking references

- Run `git remote prune origin` to clean up stale remote tracking references.
- Notify the user of the result.

### 2) Checkout base branch

- Checkout `base_branch`.
- Notify the user: "Checked out branch: {base_branch}."

### 3) Pull latest

- Pull latest changes for `base_branch` from remote.
- Notify the user of the result (up to date, or how many commits were pulled).

### 4) Identify feature branches to delete

- List all local branches.
- Exclude `master` and the current `base_branch`.
- For each remaining branch, check if it has a remote tracking reference (`git branch -vv`).
- Only include branches with **no remote tracking reference** as candidates for deletion.
- If no candidates are found, notify the user: "No local-only feature branches found to delete." and stop.

### 5) Confirm deletion

- Display the full list of candidate branches to the user.
- Ask: "The following branches will be deleted: {branch_list}. Confirm? (yes/no)"
- Do not delete anything until the user explicitly confirms with "yes".
- If the user says "no" or declines, notify: "Branch deletion cancelled." and stop.

### 6) Delete feature branches

- Delete each confirmed branch locally.
- Notify the user of each deletion as it completes.

### 7) Summary

- Post a brief summary confirming:
  - current branch: `base_branch`
  - remote references pruned
  - latest pulled
  - branches deleted (or none if cancelled)

## Guardrails

- Never delete `master` or the checked-out base branch.
- Never delete branches without explicit user confirmation.
- Do not push any deletions to remote unless explicitly requested.
