---
name: resolve-comments
description: >
  Load this skill when the user says "resolve comments", "resolve-comments", or
  "/resolve-comments". Checks open PR review comments, addresses valid ones in a
  single batched commit, and resolves all threads with appropriate replies.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-pr-review
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **resolve-comments**. Starting PR comment resolution..."

## Inputs

- `pr_number`: prefer to infer from the PR created earlier in the current session.
- If no PR was created in this session, ask: "What is the PR number to resolve comments for?"

## Procedure

### 0) Gather inputs

- Check if a PR was created earlier in this session and retrieve its number automatically.
- If no PR number is available, ask: "What is the PR number to resolve comments for?"
- Do not proceed until `pr_number` is confirmed.

### 1) Fetch all unresolved comments

- Fetch all open/unresolved review comments and threads on PR `#{pr_number}`.
- If there are no unresolved comments, notify the user: "No unresolved comments found on PR #{pr_number}." and stop.

### 2) Classify all comments

- Review **all** unresolved comments before making any changes.
- Classify each as:
  - **valid** — feedback is correct and warrants a code or documentation change.
  - **invalid** — feedback is incorrect, out of scope, or already addressed.

### 3) Address valid feedback (batched)

- Implement fixes for **all valid** comments together.
- Create **at most one commit** for all valid fixes (unless user explicitly requests otherwise).
- Push once.
- Post a PR comment: `@copilot, please review again`.

### 4) Reply and resolve all threads

- For each **valid** thread:
  - reply describing exactly what was changed to address the feedback.
  - resolve the thread.
- For each **invalid** thread:
  - reply respectfully with clear rationale explaining why no change was made.
  - resolve the thread.

### 5) Summary

- After all threads are resolved, post a brief summary comment on the PR listing:
  - how many comments were addressed,
  - how many were dismissed as invalid.

## Guardrails

- Do not use force push or destructive git history commands unless explicitly requested.
- Do not amend commits unless explicitly requested.
- Keep replies concise and professional.
