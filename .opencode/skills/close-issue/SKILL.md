---
name: close-issue
description: >
  Load this skill when the user says "close issue", "close-issue", or
  "/close-issue". Verifies acceptance criteria, ticks off passing AC checkboxes,
  closes the story issue, then updates the Epic Reference checkbox in the parent
  issue.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **close-issue**. Verifying acceptance criteria, closing issue, and updating epic..."

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the current session.
- `parent_issue_number`: prefer to infer from the parent epic referenced earlier in the current session.
- If either value is not available from the session, ask for the missing value(s) before proceeding.

## Procedure

### 0) Gather inputs

- Check if `issue_number` is available from the current session.
- Check if `parent_issue_number` is available from the current session.
- If `issue_number` is missing, ask: "What is the story issue number?"
- If `parent_issue_number` is missing, ask: "What is the parent epic issue number?"
- Do not proceed until both values are confirmed.

### 1) Verify acceptance criteria

- Fetch the body of issue `#{issue_number}`.
- Extract IT codes from `## Epic Reference > Acceptance Criteria` (e.g. `M1IT1`) and UC codes from `## Acceptance Criteria (G/W/T)` (e.g. `M1UC1`).
- For each IT code: run `dotnet test --filter "AC=<CODE>"` — if it passes, tick the matching `## Epic Reference > Acceptance Criteria` checkbox in the issue body.
- For each backend UC code: run `dotnet test --filter "AC=<CODE>"` — if it passes, tick the matching `## Acceptance Criteria (G/W/T)` checkbox.
- For each frontend UC code: run `npx vitest run --reporter=verbose` — if the specific test passes, tick the matching `## Acceptance Criteria (G/W/T)` checkbox.
- Update the issue body via `gh issue edit` with all ticked checkboxes.
- Notify the user: "Acceptance criteria verified for #{issue_number}. {n}/{m} passing."

### 2) Check and close story issue

- Fetch the current state of issue `#{issue_number}`.
- If the issue is already closed:
  - notify the user: "Issue #{issue_number} is already closed."
- If the issue is still open:
  - close issue `#{issue_number}`.
  - notify the user: "Issue #{issue_number} has been closed."

### 3) Update Epic Reference checkbox in parent issue

- Fetch the body of parent issue `#{parent_issue_number}`.
- In the "Anticipated Work Areas" section, locate the checklist item that references `#{issue_number}`.
- Mark that checkbox as checked.
- Update the parent issue body with the change.
- Notify the user: "Epic Reference checkbox for #{issue_number} updated in issue #{parent_issue_number}."

### 4) Summary

- Post a brief summary to the user confirming:
  - acceptance criteria: {n}/{m} passing,
  - final state of issue `#{issue_number}` (closed),
  - Epic Reference checkbox updated in parent issue `#{parent_issue_number}`.

## Guardrails

- Do not close any issue other than `#{issue_number}`.
- Do not modify any content in the issue or parent issue other than the AC checkboxes and the "Anticipated Work Areas" section checkbox.
- Only tick AC checkboxes for tests that actually pass. Do not mark failing or untested criteria as passed.
- Keep all communication concise and professional.
