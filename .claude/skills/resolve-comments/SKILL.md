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

- `pr_number`: prefer to infer from the PR created earlier in the current
  session.
- `issue_number`: prefer to infer from the issue implemented earlier in the
  current session.

If neither is available, ask: "What is the PR number, and what is the issue
number?"

## Procedure

### 0) Gather inputs

- Check if a PR and issue were referenced earlier in this session and retrieve
  their numbers automatically.
- If `pr_number` is missing, ask: "What is the PR number to resolve comments
  for?"
- If `issue_number` is missing, ask: "What is the issue number?"
- Do not proceed until both are confirmed.

### 1) Read the issue

Fetch issue `#{issue_number}` and extract the following sections. These are
the reference for judging whether review feedback is valid.

- **`## Functional Requirements`** — what the story was required to deliver.
- **`## API / Interface Contract`** — the agreed contract. Comments asking to
  deviate from this are invalid unless the contract itself was wrong.
- **`## Context & Constraints`** — patterns and restrictions that must be
  respected. Comments contradicting a stated constraint are invalid.
- **`## Notes`** — deliberate deferrals and known edge cases. Comments raising
  something explicitly deferred in Notes are invalid for this issue.

### 2) Fetch all unresolved comments

- Fetch all open/unresolved review comments and threads on PR `#{pr_number}`.
- If there are no unresolved comments, notify the user: "No unresolved comments
  found on PR #{pr_number}." and stop.

### 3) Classify all comments

Review **all** unresolved comments before making any changes. Classify each as:

- **Valid** — the feedback is correct and warrants a code or documentation
  change. It identifies a genuine gap against the requirements, a standards
  violation, or a correctness issue.
- **Invalid** — the feedback is incorrect, contradicts a stated constraint,
  raises something explicitly deferred in `## Notes`, or is already addressed.

If a comment's validity cannot be determined from the issue content alone, flag
it as a **Question** for the user before proceeding. Do not guess.

Present the classification to the user before making any changes:

> "Classification complete. {n} valid, {n} invalid, {n} questions. Proceed?"

Do not proceed until the user confirms.

### 4) Address valid feedback (batched)

- Implement fixes for **all valid** comments together.
- Run the relevant checks for the affected scope before committing:
  - Backend changes: `dotnet build src/PanoramaMusic.slnx` and
    `dotnet test src/PanoramaMusic.Tests`
  - Frontend changes: `npm run lint`, `npm run typecheck`, and
    `npm run test` (or `npx vitest run` if no `test` script)
- If any check fails, fix the failure before proceeding. Do not commit or
  push with failing checks.
- Create **at most one commit** for all valid fixes (unless the user explicitly
  requests otherwise).
- Push once.

### 5) Reply and resolve all threads

- For each **valid** thread:
  - Reply describing exactly what was changed to address the feedback.
  - Resolve the thread.
- For each **invalid** thread:
  - Reply respectfully with clear rationale explaining why no change was made,
    citing the relevant issue section where applicable (e.g. "This was
    deliberately deferred in the issue Notes").
  - Resolve the thread.
- If thread resolution fails (e.g. permissions or API error), note this in
  the final summary rather than failing silently — replies should still be
  posted even if resolution doesn't succeed.

### 6) Summary

After all threads are resolved, post a brief summary comment on the PR listing:
- how many comments were addressed,
- how many were dismissed as invalid (with a one-line reason for each).

## Guardrails

- Do not use force push or destructive git history commands unless explicitly
  requested.
- Do not amend commits unless explicitly requested.
- Do not classify a comment as invalid solely because fixing it would be
  inconvenient. Invalid means factually wrong, out of scope, or explicitly
  deferred — not merely unwelcome.
- Keep replies concise and professional.