---
name: update-coding-standards
description: >
  Load this skill when the user says "update coding standards",
  "update-coding-standards", or "/update-coding-standards". Analyzes the diff of
  a merged PR and appends any valuable new patterns to the relevant coding
  standards doc — but only if something genuinely warrants documenting.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: documentation
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **update-coding-standards**. Reviewing merged PR for new
> patterns..."

## Inputs

- `target_branch`: the branch the PR was merged into (e.g. `milestone/m1`).
- `pr_number`: the number of the merged PR.

Optional:
- Repository owner/name if not inferable from git remote.

## Goal

After a PR has been squash-merged into its target branch, analyze the full diff
and determine whether any new patterns, conventions, or decisions from that
implementation would benefit from being documented in the relevant coding
standards doc. Only propose additions if the documentation would meaningfully
improve consistency of future work.

## Guardrails

- **Never rewrite or remove existing content.** Only append to relevant
  sections within the coding standards docs.
- **Never propose trivial or obvious patterns** (e.g. "a new file was created",
  "a new method was added"). Every proposal must have a clear justification:
  "the next piece of work would produce different (better) code if this was
  documented."
- The coding standards docs may not exist yet (M0 has not been implemented).
  If neither exists, report this and stop. If only one exists, use that one.
- **User approval is required before any edit.**
- "Nothing to add" is a perfectly valid outcome — do not force additions.
- Keep all communication concise and professional. No emojis.

## Procedure

### 0) Gather inputs

- If `target_branch` was not provided, ask: "What branch was the PR merged into?"
- If `pr_number` was not provided, ask: "What is the PR number?"
- Do not proceed until both are confirmed.

### 1) Verify branch

- Run `git branch --show-current`.
- If current branch does not match `target_branch`, notify and stop.

### 2) Get the merge commit SHA

```
gh pr view ${pr_number} --json mergeCommit --jq '.mergeCommit.oid'
```

- If the result is null or empty, the PR has not been merged. Notify:
  > "PR #${pr_number} has not been merged yet. Merge the PR before running
  > this skill."
  and stop.
- Capture the commit SHA.

### 3) Get the full diff and determine scope

```
git diff ${sha}~1 ${sha}
```

- If files changed is empty, notify and stop.
- Get the list of changed files:
  ```
  git diff ${sha}~1 ${sha} --name-only
  ```
- Determine which coding standards doc(s) are relevant:
  - If any changed file path starts with `src/` → backend scope.
  - If any changed file path starts with `frontend/` → frontend scope.
  - If both → both scopes.
  - If neither (e.g. only workflow or config files changed) → report "No
    source code files changed. Nothing to analyze." and stop.
- For each relevant scope, check that the corresponding doc exists:
  - `docs/coding-standards-backend.md` for backend scope
  - `docs/coding-standards-frontend.md` for frontend scope
  - If a doc does not exist, note that it is not yet set up — skip that scope.
- Read the existing doc(s) in full for the relevant scope(s).

### 4) Analyze for valuable additions

For each relevant scope, examine the diff and compare against what is already
documented in the corresponding standards doc. Look specifically for:

- **New naming conventions** — class names, file names, route patterns,
  migration naming, DTO suffixes, enum casing, component naming.
- **New layer/structure patterns** — files placed in subdirectories or
  following structural conventions that future work should replicate.
- **New query patterns** (backend only) — Dapper SQL patterns, CTEs,
  transaction boundaries, connection management patterns.
- **New error handling or middleware patterns** — global exception handlers,
  validation approaches, response envelope shapes.
- **New configuration or environment variable patterns** — sections in
  `appsettings.json`, env var naming conventions.
- **New API contract patterns** — route shapes, request/response DTO
  conventions, query parameter conventions.
- **New component patterns** (frontend only) — Web Component patterns, state
  management, event handling, service integration.
- **Any non-obvious pattern** that a future implementer, working without
  knowledge of this specific implementation, would benefit from knowing
  upfront.

For each candidate, ask: "If someone implements the next task without seeing
this code, would they produce different (and worse) code because this pattern
is not documented?" If the answer is no, discard it.

### 5) Present findings and decide

**If nothing valuable was identified in any scope:**
- Report:
  > "No meaningful additions identified. Coding standards unchanged."
- Stop.

**If one or more valuable additions were identified:**
- Present each proposed addition concisely in a numbered list, grouped by
  scope (backend / frontend). For each:
  - What the pattern is
  - Why it matters for future consistency
  - Which doc and section it would go in (e.g. "`coding-standards-backend.md` >
    Naming Conventions")
- Then ask:
  > "Add these to the coding standards? (yes/no/select items)"
- If the user says **no** — do nothing. Report: "Skipped. Coding standards
  unchanged."
- If the user says **yes** or selects specific items — append each approved
  addition to its relevant doc and section. Notify:
  > "Coding standards updated with the following additions:"
  > (list of what was added, and to which doc)

### 6) Summary

Post a brief summary:
- PR analyzed: `#${pr_number}` merged into `{target_branch}`
- Scope: backend / frontend / both
- Outcome: nothing added / X items added
- If items were added: which docs and sections were updated
