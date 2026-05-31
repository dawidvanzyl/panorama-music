---
name: close-milestone
description: >
  Load this skill when the user says "close milestone", "close-milestone", or
  "/close-milestone". Creates the milestone-to-master PR, launches the
  close-milestone-watch command, and orchestrates the end of a milestone cycle.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **close-milestone**. Starting milestone close workflow..."

## Inputs

- `epic_issue_number`: the GitHub issue number of the milestone epic (e.g. `3`).

## Goal

Close out a completed milestone by:
1) verifying all sub-issues are closed,
2) creating a PR from `milestone/m{number}` to `master`,
3) launching the `close-milestone-watch` command that waits for the merge,
4) which then closes the GitHub milestone, runs prepare-base on master, and tags.

## Guardrails

- **Refuse if any sub-issues under the epic are still open.**
- **Refuse if the current branch is not `milestone/m{number}`.**
- **Refuse if the working tree is dirty.**
- **No file edits, no commits beyond git commands.**
- Keep all communication concise and professional. No emojis.

## Procedure

### 0) Gather inputs

- If `epic_issue_number` was not provided, ask: "What is the epic issue number?"
- Do not proceed until the value is confirmed.

### 1) Read context

- Fetch the epic issue `#{epic_issue_number}`.
- Extract `milestone_number` from the title using pattern
  `[Backlog] M{number} —`. For example, `[Backlog] M1 — Identity & Auth` yields
  milestone number `1`.
- If the pattern does not match, notify and ask for the milestone number manually.
- Derive `milestone_branch` = `milestone/m{milestone_number}`.
- Derive `milestone_title` from the epic's milestone field.
- Parse the epic's `## Acceptance Criteria` section for all `[IT_CODE]` markers
  and their checkbox text. Save as a list of `{code, checkbox_line}`.

### 2) Validate prerequisites

- Run `git branch --show-current`.
  - If not `milestone_branch`, notify and stop.
- Run `git status --porcelain`.
  - If not empty, notify and stop.
- Use GraphQL to fetch sub-issues of the epic:
  ```
  gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") {
    issue(number: EPIC_NUM) { subIssues(first: 50) {
      nodes { number title state }
    } } } }'
  ```
  - If any sub-issue has state not equal to `CLOSED`, list them and stop.
- Run all integration tests for this milestone:
  `dotnet test --filter "AC~M{milestone_number}IT" --no-restore`
  - If any tests fail, collect all failure names, list them, and stop.
  - If all tests pass, fetch the epic body and mark each `[IT_CODE]` checkbox
    in `## Acceptance Criteria` as `[x]`. Update the epic body via
    `gh issue edit #{epic_issue_number} --body "..."`.

### 3) Push and create PR

- Run `git push origin milestone/m{milestone_number}`.
- Create PR to master:
  ```
  gh pr create \
    --base master \
    --head milestone/m{milestone_number} \
    --title "Milestone M{milestone_number} — {milestone_title}" \
    --milestone "{milestone_title}" \
    --body "## Summary\n\nMilestone M{milestone_number} — {milestone_title}.\n\nCloses #{epic_issue_number}."
  ```
- Capture the PR number from the output.

### 4) Launch close-milestone-watch command

- Run the `/close-milestone-watch` command with:
  - `$1` = PR number from step 3
  - `$2` = milestone number from step 1

### 5) Summary

Post a brief summary once the command completes:

> "Milestone M{milestone_number} complete. PR #${pr_number} merged to master, milestone closed, tag created, master checked out and up to date."
