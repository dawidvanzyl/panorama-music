---
name: close-issue
description: >
  Load this skill when the user says "close issue", "close-issue", or
  "/close-issue". Checks if the implemented story issue is closed, closes it if
  not, then updates the Epic Reference checkbox in the parent issue.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **close-issue**. Checking issue status and updating epic..."

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

### 1) Check and close story issue

- Fetch the current state of issue `#{issue_number}`.
- If the issue is already closed:
  - notify the user: "Issue #{issue_number} is already closed."
- If the issue is still open:
  - close issue `#{issue_number}`.
  - notify the user: "Issue #{issue_number} has been closed."

### 2) Update Epic Reference checkbox in parent issue

- Fetch the body of parent issue `#{parent_issue_number}`.
- In the "Anticipated Work Areas" section, locate the checklist item that references `#{issue_number}`.
- Mark that checkbox as checked.
- Update the parent issue body with the change.
- Notify the user: "Epic Reference checkbox for #{issue_number} updated in issue #{parent_issue_number}."

### 3) Summary

- Post a brief summary to the user confirming:
  - final state of issue `#{issue_number}` (closed),
  - Epic Reference checkbox updated in parent issue `#{parent_issue_number}`.

## Guardrails

- Do not close any issue other than `#{issue_number}`.
- Do not modify any content in the parent issue other than the relevant "Anticipated Work Areas" section checkbox.
- Keep all communication concise and professional.
