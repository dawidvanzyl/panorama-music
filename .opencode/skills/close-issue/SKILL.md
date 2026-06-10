---
name: close-issue
description: >
  Load this skill when the user says "close issue", "close-issue", or "/close-issue".
  Verifies acceptance criteria, updates checkboxes, closes the story issue, and updates
  the Epic Reference checkbox in the parent issue.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

## Announcement

At the start of execution, always post:

> "Loaded skill: **close-issue**. Verifying acceptance criteria, closing issue, and updating epic..."

---

## Inputs

- `issue_number` (inferred if possible)
- `parent_issue_number` (inferred if possible)

If either is missing:
- request missing values
- do not proceed until both are provided

---

## REQUIRED ISSUE FORMAT (STRICT)

This skill only works if the issue follows this exact AC structure:

### Epic Reference → Acceptance Criteria (IT)
- [ ] AC: M1IT1 description
- [ ] AC: M1IT2 description

### Acceptance Criteria (G/W/T) (UC)
- [ ] AC: M1UC1 description
- [ ] AC: M1UC2 description

Rules:
- Each checkbox line MUST start with: `- [ ] AC:`
- The code MUST immediately follow `AC: `
- No inference from free text is allowed
- If format does not match → STOP immediately

---

## Procedure

---

### 1) Gather inputs

- confirm `issue_number`
- confirm `parent_issue_number`
- validate AC format compliance

If invalid:
- stop execution
- report format violation

---

### 2) Extract acceptance criteria

From issue `#{issue_number}`:

- IT codes: from Epic Reference section
- UC codes: from G/W/T section

Extraction rule:
- only parse lines matching:
  `- [ ] AC: <CODE>`

Example:
- `- [ ] AC: M1IT1 description → M1IT1`

---

### 3) Run tests (BATCHED ONLY)

#### Backend / IT / UC backend
```bash
dotnet test --logger trx
````

#### Frontend

```bash
npx vitest run
```

Rules:

* run each suite once only
* map results to AC codes post-execution
* no per-AC test execution

---

### 4) Evaluate results

For each AC:

* PASS → eligible for checkbox tick
* FAIL → leave unchanged

Compute:

* n = passed
* m = total

---

### 4a) Failure handling (STOP CONDITION)

If any AC fails:

* optionally tick only passing ones
* DO NOT close issue
* output:

"Acceptance criteria partially verified for #{issue_number}: {n}/{m} passing. Issue remains open."

STOP.

---

### 5) Update issue (idempotent)

Rules:

* re-fetch issue before editing
* only update if checkbox state changes
* never re-write unchanged body

Use:

```bash
gh issue edit #{issue_number}
```

---

### 6) Close issue

If already closed:

* notify and continue

If open:

* close via:

```bash
gh issue close #{issue_number}
```

---

### 7) Update parent epic

Parent checklist formats supported:

* `- [ ] ISSUE:123 description`
* `- [ ] #123 description`

Rules:

* match issue number exactly
* only toggle checkbox state
* do not edit text

If not found:

* report missing parent linkage

---

### 8) Summary

Return:

* AC result: n/m passing
* issue state: closed/open
* parent update: success/failure