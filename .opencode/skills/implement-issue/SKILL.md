---
name: implement-issue
description: >
  Load this skill when the user says "implement issue", "implement-issue", or
  "/implement-issue". Implements a GitHub story issue end-to-end: prepares base
  branch, creates feature branch, implements the plan, verifies via the
  verify-implementation skill, and opens a PR.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **implement-issue**. Starting workflow..."

---

## Inputs

Required:

- `issue_number`
- `parent_issue_number`

Optional:

- repository owner/name if not inferable from git remote

---

## Goal

Execute the full story implementation workflow:

1. prepare base branch
2. read and validate issue
3. validate dependencies
4. load standards
5. create feature branch
6. implement
7. verify implementation
8. create pull request

---

## Source of Truth (ABSOLUTE RULE)

Implementation decisions may only be based on:

- GitHub issue body
- `docs/coding-standards.md`
- `docs/coding-standards-backend.md`
- `docs/coding-standards-frontend.md`
- `src/.editorconfig`
- `frontend/.editorconfig` (if present)

Do not use:

- labels
- comments
- external discussion
- assumptions

If information is missing or ambiguous:

> Stop and ask.

---

## Procedure

### 0) Gather inputs

If `issue_number` is missing:

> "What is the issue number to implement?"

If `parent_issue_number` is missing:

> "What is the parent epic issue number?"

Do not proceed until both are known.

---

### 1) Prepare base branch

Invoke:

- `prepare-base`

Allow `prepare-base` to operate independently.

After completion:

```bash
git branch --show-current
````

Capture result as:

* `base_branch`

This branch becomes the PR target branch.

---

### 2) Read issue (STRICT SOURCE RULE + STRUCTURED PARSING)

Read ONLY the GitHub issue body.

Parse the following sections exactly:

* `## Overview`
* `## Epic Reference`
* `## Scope`
* `## Initial Implementation Plan`
* `## Acceptance Criteria (G/W/T)`
* `## Notes`

Ignore completely:

* `## Post-Implementation Summary`

---

### Overview

Extract:

* issue title
* implementation intent

Overview is context only and must not override acceptance criteria.

---

### Epic Reference

Extract:

* milestone reference
* anticipated work areas
* Epic Acceptance Criteria
* IT codes

Expected format:

```text
- [ ] [M1IT1] ...
- [ ] [M1IT2] ...
```

Acceptance Criteria in this section define:

* integration-test requirements only

---

### Scope

Extract:

* in-scope items
* out-of-scope items

Scope is a hard implementation boundary.

Do not implement outside scope.

---

### Initial Implementation Plan

Treat as:

* advisory guidance

The implementation may differ if required.

The plan must never override:

* Scope
* Acceptance Criteria
* Coding Standards

---

### Acceptance Criteria (G/W/T)

Extract:

* backend UC codes
* frontend UC codes

Expected format:

```text
- [ ] [M1UC1] ...
- [ ] [M1UC2] ...
```

These criteria define:

* behavioural requirements
* unit-test requirements
* frontend-test requirements

This section is the primary definition of done.

---

### Notes

Treat as:

* implementation context
* constraints
* prior decisions

Notes must not override acceptance criteria or scope.

---

### Acceptance Criteria Coverage Rule

Every extracted acceptance-criteria code must map to test coverage.

Required coverage:

* Every IT code → integration test(s)
* Every backend UC code → backend unit test(s)
* Every frontend UC code → frontend test(s)

If a code cannot be mapped to a test:

> Stop and ask for clarification.

---

### 3) Dependency Gate (HARD STOP)

Locate:

```text
## Dependencies
```

Parse:

```text
Blocked by: #X
```

For every blocked dependency:

* check issue status

If ANY blocked issue is not closed:

Stop immediately.

Output:

> "Blocked dependency detected: #X is not closed. Implementation cannot proceed."

Do not:

* load standards
* create branch
* write code
* run verification

---

### 4) Load standards (MANDATORY)

Read:

* `docs/coding-standards.md`

Backend scope:

* `docs/coding-standards-backend.md`
* `src/.editorconfig`

Frontend scope:

* `docs/coding-standards-frontend.md`
* `frontend/.editorconfig` (if present)

Determine implementation scope:

* backend → `src/`
* frontend → `frontend/`

Apply all standards throughout implementation.

---

### 5) Create feature branch

Create:

```text
feature/M{milestone_number}-{issue_number}-{slug}
```

Slug rules:

* lowercase
* alphanumeric and hyphens only
* collapse duplicate separators
* maximum 80 characters

Create from current HEAD.

---

### 6) Implement

Implement strictly according to:

* issue body
* scope constraints
* coding standards
* editorconfig rules

Never implement outside scope.

---

### Testing Rules (MANDATORY)

#### Integration Tests

Source:

* Epic Reference → Acceptance Criteria

Codes:

* IT codes only

Requirements:

* backend integration test project
* every IT code must be covered

Required attribute:

```csharp
[Trait("AC", "M1ITx")]
```

---

#### Backend Unit Tests

Source:

* Acceptance Criteria (G/W/T)

Codes:

* backend UC codes only

Requirements:

* backend unit test project
* every backend UC code must be covered

Required attribute:

```csharp
[Trait("AC", "M1UCx")]
```

---

#### Frontend Tests

Source:

* Acceptance Criteria (G/W/T)

Codes:

* frontend UC codes only

Requirements:

* Vitest tests
* every frontend UC code must be covered

Required structure:

```ts
describe('...', () => {
  ...
}, { tags: ['M1UCx'] });
```

Frontend test tags must be registered in:

```text
vitest.config.ts
```

---

### Test Layer Ownership Rule

Acceptance criteria belong to exactly one test layer.

* IT codes → integration tests only
* UC codes → unit/frontend tests only

Do not duplicate acceptance-criteria coverage across multiple test layers unless explicitly required.

---

### Uncertainty Rule

If the correct test project or test layer cannot be determined:

> Stop and ask before implementing tests.

---

### Documentation Rule

If behaviour, setup, usage, configuration, or developer workflow changes:

* update `README.md`

Examples:

* new endpoints
* new commands
* new configuration
* new setup steps
* changed workflows

---

### Quality Gates (MANDATORY)

Backend checks:

```bash
dotnet build src/PanoramaMusic.sln
dotnet format src/PanoramaMusic.sln --verify-no-changes
dotnet test src/PanoramaMusic.Tests
```

Frontend checks:

```bash
npm run lint
npm run typecheck
npx vitest run
```

Run only applicable frontend commands.

---

### Failure Rule

If any quality gate fails:

* fix the issue
* re-run checks
* repeat until all checks pass

Do not proceed while checks are failing.

---

### 7) Verify implementation

Invoke:

* `verify-implementation`

Allow the skill to operate independently.

Do not proceed until verification is resolved.

Possible outcomes:

* fix specific findings and re-run
* dismiss specific findings
* dismiss entire report and proceed

---

### 8) Commit

Commit according to:

```text
docs/coding-standards.md → Commit Messages
```

Do not redefine commit rules here.

---

### 9) Open Pull Request

Ask:

> "Are you ready to post a pull request?"

If no:

- stop and wait

If yes:

- commit changes
- push feature branch

Create PR:

```bash
gh pr create \
  --base base_branch \
  --title "{issue_title} (#{issue_number})" \
  --milestone "{milestone_title}" \
  --body "
Summary of changes:
- ...

Closes #{issue_number}
Milestone: {milestone_title}
"
```

---

### Post-Creation Metadata Validation

After PR creation:

1. Capture the PR number.
2. Verify:
   - target branch is `base_branch`
   - milestone is assigned correctly
   - issue `#{issue_number}` is linked to the PR

---

### Milestone Repair

If milestone assignment is missing:

```bash
gh pr edit {pr_number} --milestone "{milestone_title}"
```

Re-check and confirm milestone assignment.

---

### Issue Link Repair

If issue `#{issue_number}` is not linked to the PR:

- Use the appropriate GitHub CLI command supported by the installed version to associate the issue with the PR.

Re-check and confirm issue linkage.

---

### Completion Criteria

PR creation is only considered complete when all of the following are true:

- PR exists successfully
- target branch is `base_branch`
- milestone is assigned
- issue `#{issue_number}` is linked to the PR
- PR title matches:

```text
{issue_title} (#{issue_number})
```

If any validation fails:

- repair the metadata
- re-validate
- repeat until all criteria are satisfied or a blocking error is encountered

---

## Guardrails

* Never proceed if dependencies are blocked.
* Never implement outside scope.
* Never assume missing information.
* Never create a PR before verification is complete.
* Never force push.
* Never rewrite history unless explicitly requested.
* Preserve unrelated local changes.
* Keep communication concise and actionable.