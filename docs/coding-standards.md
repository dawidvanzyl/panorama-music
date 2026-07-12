# Coding Standards — Shared Workflow Spec (v1.4)

This document defines the **global workflow rules** for the Panorama Music project.
It applies across backend and frontend unless explicitly constrained by stack-specific standards.

---

## 0. Issue Conventions

Every issue kind has a required title prefix and label. Both are enforced by the
matching `.github/ISSUE_TEMPLATE/*.md` file — do not deviate from either.

| Issue kind | Title prefix | Label | Template |
|---|---|---|---|
| Epic | `[Backlog]` | `epic: backlog` | `epic-issue.md` |
| Feature sub-issue | `[Feature]` | `type: feature` | `sub-issue.md` |
| Bug | `[Bug]` | `type: bug` | `sub-issue.md` (same shape, swap prefix/label) |
| Tech debt | `[Tech Debt]` | `type: tech-debt` | `tech-debt-issue.md` |

**Milestone references are derived purely from the GitHub milestone field
attached to an issue — never from the issue's own title text.** An epic's
milestone tag/number (e.g. `1.1`, used for branch/tag naming) is read from the
**assigned milestone's own title** (`gh issue view {n} --json milestone`), not
parsed out of the epic issue's title. Epic and sub-issue titles never encode a
milestone tag.

---

## 1. Branching Model

### 1.1 Branch Types

Two branch categories exist:

### Feature / Bug / Tech-Debt branches

```text id="g8v2kq"
{feature|bug|tech-debt}/{issue_number}-{slug}
```

The prefix is chosen from the issue's label:

| Label | Prefix |
|---|---|
| `type: feature` | `feature/` |
| `type: bug` | `bug/` |
| `type: tech-debt` | `tech-debt/` |

Example:

```text id="0m6c2s"
feature/55-coding-standards-backend-cleanup
```

Rules:

* Must be tied to a GitHub issue
* Must originate from the correct base branch (see workflow modes)
* Must always be merged via PR
* Must be short-lived
* Slug must be kebab-case, derived from the issue title, max 5 words
* No milestone number in the branch name — milestone membership (Mode A) is
  tracked via the issue's GitHub milestone field, not the branch name

---

### Milestone branches

```text id="m3v9qp"
milestone/m{milestone_number}
```

Example:

```text id="z1n8xd"
milestone/m0
```

`milestone_number` is derived from the **epic's assigned milestone title**
(see `## 0. Issue Conventions`), never from the epic issue's own title.

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
* Every change must be developed in a feature/bug/tech-debt branch
* Feature branches belong to exactly one milestone
* Milestone is the integration boundary

Workflow:

```text id="a7p3lm"
{feature|bug|tech-debt}/* → milestone/m{n} → master
```

Rules:

* Milestones are mandatory
* No feature branch may merge directly into `master`

---

### Mode B — Direct-to-master development (post-v1.0)

* All changes still use feature/bug/tech-debt branches
* All changes go through PRs
* Feature branches merge directly into `master`
* Milestones are not required for normal work

Workflow:

```text id="r2c9zw"
{feature|bug|tech-debt}/* → master
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

* `milestone/m{n}` (Mode A only)
* `master`

---

### 3.3 PR Flow Rules

* Feature/bug/tech-debt → milestone (Mode A only)
* Feature/bug/tech-debt → master (Mode B only)
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

---

### 3.5 Merge Rules

* No direct commits on `master`
* feature/*, bug/*, and tech-debt/* branches are always squash-merged into their target
* milestone/* branches are always merge-committed into master (no squash — history must be preserved)
* No other merge strategies are permitted
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

---

## 6. Acceptance Criteria Test Codes

### 6.1 Format

* Unit tests (backend and frontend): `{issue_number}UC{n}`
* Playwright E2E: `{issue_number}IT{n}`

Codes are scoped to an issue's own number — never a milestone. Two issue
numbers can appear in a sub-issue's body: UC codes use **that sub-issue's**
own number; IT codes (both under `## Epic Reference` and `## Acceptance
Criteria (G/W/T) > ### E2E`) are copied verbatim from the **epic's** own
Acceptance Criteria and so carry the epic's number instead.

### 6.2 Rules

* One IT code per Playwright spec file/`describe` block, repeated across
  every G/W/T line that block covers.
* Never use `NFC` as a code — assign a real `UC`/`IT` code.
* Codes are opaque matching strings to test runners (`dotnet test --filter
  "AC=CODE"`, vitest `--tags-filter="AC=CODE"`, `playwright test --grep
  "@CODE"`) — the format itself carries no special meaning to tooling beyond
  being a literal string.

### 6.3 Not retroactive

This format applies to all **new** issues going forward. It does **not**
apply retroactively — existing milestone-prefixed codes (e.g. `M1UC12`,
`@M1.2IT3`) on already-created issues and tests remain valid and unchanged.
Do not rename or migrate them.