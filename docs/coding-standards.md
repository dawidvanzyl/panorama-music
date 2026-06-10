# Coding Standards — Shared Workflow Spec (v1.3)

This document defines the **global workflow rules** for the Panorama Music project.
It applies across backend and frontend unless explicitly constrained by stack-specific standards.

---

## 1. Branching Model

### 1.1 Branch Types

Only two branch types exist:

### Feature / Bug branches

```text id="g8v2kq"
feature/M{milestone_number}-{issue_number}-{slug}
```

Example:

```text id="0m6c2s"
feature/M0-55-coding-standards-backend-cleanup
```

Rules:

* Must be tied to a GitHub issue
* Must originate from the correct base branch (see workflow modes)
* Must always be merged via PR
* Must be short-lived

---

### Milestone branches

```text id="m3v9qp"
milestone/M{milestone_number}
```

Example:

```text id="z1n8xd"
milestone/M0
```

Rules:

* Used only in milestone-driven development mode
* Acts as integration branch for grouped work
* Receives merges only from feature branches (Mode A)

---

## 1.2 Workflow Modes

The system operates in two explicit modes.

---

### Mode A — Milestone-driven development (pre-v1.0 and major release cycles)

* Work is organised into milestones
* Every change must be developed in a feature/bug branch
* Feature branches belong to exactly one milestone
* Milestone is the integration boundary

Workflow:

```text id="a7p3lm"
feature/* → milestone/Mx → master
```

Rules:

* Milestones are mandatory
* No feature branch may merge directly into `master`

---

### Mode B — Direct-to-master development (post-v1.0)

* All changes still use feature/bug branches
* All changes go through PRs
* Feature branches merge directly into `master`
* Milestones are not required for normal work

Workflow:

```text id="r2c9zw"
feature/* → master
```

Rules:

* Feature branches are mandatory
* PRs are mandatory
* Direct commits to `master` are strictly forbidden

---

## 1.3 Global Workflow Rules (All Modes)

These rules always apply:

* No direct commits to `master`
* All changes must originate from a branch
* All changes must go through a PR
* No bypassing of defined workflow topology
* Branching is never optional

---

## 2. Commit Messages

### 2.1 Format

```text id="x0v8na"
{type}({scope}): {short description}
```

---

### 2.2 Allowed Types

* feat
* fix
* docs
* refactor
* test
* chore
* ci

---

### 2.3 Scope Rules (Strict)

Scopes are not free-form.

> Scope must match an existing folder or module name exactly.

Rules:

* No invented scopes
* No synonyms or duplicates
* No abbreviations unless they match code structure exactly
* Scope must align with repository structure

Example:

```text id="q4d9pl"
feat(api): add song endpoint
fix(db): correct migration ordering
refactor(ui): simplify song card component
chore(ci): update pipeline config
```

---

### 2.4 Breaking Changes

Breaking changes must be explicitly marked:

```text id="b8m2xa"
feat(api)!: change song response contract
```

or

```text id="k5n7zc"
feat!: redesign authentication flow
```

---

### 2.5 Commit Hygiene Rules

* Imperative mood
* No trailing period
* Subject ≤ 72 characters
* Use body for non-trivial changes
* Reference issues:

  * `Closes #N`
  * `Refs #N`

---

## 3. Pull Requests

### 3.1 PR Structure

* Title:

```text id="u6p1cv"
{issue_title} (#{issue_number})
```

* Body must include:

  * Summary of change
  * `Closes #{issue_number}`
  * Milestone reference (if applicable)

---

### 3.2 Allowed Targets

* `milestone/M{n}` (Mode A only)
* `master`

---

### 3.3 PR Flow Rules

* Feature → milestone (Mode A only)
* Feature → master (Mode B only)
* milestone → master (final integration step in Mode A)
* No workflow bypassing allowed

---

### 3.4 PR Lifecycle Rules

#### PR Creation Gate

A PR cannot be created unless:

* solution builds successfully
* formatting/linting passes
* all tests pass

---

#### PR Merge Readiness Gate

A PR is not ready to be merged unless:

* CI passes
* tests pass
* issue is linked
* no unresolved TODOs blocking functionality

---

### 3.5 Merge Rules

* Squash merge or rebase merge only
* No merge commits on `master`
* milestone → master merges should preserve clean history (prefer squash unless debugging requires otherwise)

---

## 4. Structural Guarantees

This workflow guarantees:

* strict traceability from issue → branch → commit → PR
* consistent enforcement of branch-based development
* controlled integration via mode-based topology
* prevention of direct-to-master changes
* predictable evolution from milestone-driven to continuous delivery

---

## 5. Documentation Hierarchy and Scope Binding

### 5.1 Rule precedence

```text id="t9k2qd"
Shared Standards (highest priority)
    ↓
Backend Standards / Frontend Standards
```

Rules:

* Shared Standards define workflow, Git rules, PR rules, and commit structure
* Backend/Frontend define implementation constraints within that workflow
* Stack-specific rules must never override Shared workflow rules

---

### 5.2 Scope of responsibility

#### Shared Standards governs:

* Branching model
* Commit message structure
* PR lifecycle and merge rules
* Milestone and workflow modes

#### Backend Standards governs:

* C#, ASP.NET Core, Dapper, DbUp, SQL function rules
* Domain/application architecture
* Data access patterns
* Backend testing rules

#### Frontend Standards governs:

* TypeScript rules
* Web Components architecture
* CSS structure and styling rules
* Frontend service/API usage rules

---

### 5.3 Conflict resolution rule

If a conflict exists:

1. Shared Standards takes priority
2. Backend/Frontend must be updated to conform
3. Exceptions are not permitted unless explicitly added to Shared Standards

---

### 5.4 Workflow invariance rule

No backend or frontend rule may introduce:

* alternative branch types
* alternative merge flows
* alternative PR requirements
* exceptions to commit structure

These are global invariants.