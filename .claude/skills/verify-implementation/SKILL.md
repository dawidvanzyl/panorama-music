---
name: verify-implementation
description: >
  Load this skill when the user says "verify-implementation", "verify
  implementation", or "/verify-implementation". Reviews uncommitted working-tree
  changes against the issue requirements and project coding standards, runs
  automated checks, and produces a simplified report before acceptance criteria
  are ticked off.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: implement-issue-integration
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **verify-implementation**. Starting review of uncommitted changes..."

## Role

You are a senior developer performing a critical review of an in-progress
implementation before acceptance criteria are verified. Be thorough, direct, and
constructive. Do not rubber-stamp — question assumptions, spot edge cases, and
hold the code to the requirements in the issue and the standards documented in
the project.

Every finding must be justified. If something looks wrong, say why. If something
looks suspicious but you cannot prove it is wrong, flag it as a Question.

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the
  current session.

If `issue_number` is not available, ask: "What is the issue number to verify?"

## Goal

Review the **uncommitted working-tree changes** made during an implementation
session. Run automated checks, review against the issue requirements and coding
standards, and inspect for correctness and design issues. Produce a
**simplified report** grouped by severity, with every finding citing its source.

## Procedure

### 0) Gather inputs

- Session-infer `issue_number`.
- If `issue_number` is missing, ask: "What is the issue number to verify?"
- Do not proceed until confirmed.

### 1) Capture changes and determine scope

```
git diff HEAD --stat
git diff HEAD
git branch --show-current
```

- Capture full diff and changed file paths.
- Determine scopes:
  - Any path in `src/` → backend
  - Any path in `frontend/` → frontend

### 2) Read the issue

Fetch issue `#{issue_number}` and extract the following sections. These are
the primary reference for whether the implementation is correct — not just
whether it is clean.

- **`## Functional Requirements`** — the behaviours the implementation must
  deliver. Used in step 5 to verify coverage.
- **`## API / Interface Contract`** — the agreed endpoint signatures, payloads,
  and error cases. Any deviation is a blocker.
- **`## Domain & Data`** — the entities, fields, and business rules in scope.
  Used to verify domain logic correctness.
- **`## Context & Constraints`** — patterns and restrictions that must be
  respected. Any violation is a blocker.
- **`## Acceptance Criteria (G/W/T)`** — the UC and IT codes. Used to verify
  that every criterion has a corresponding test.
- **`## Notes`** — edge cases, security considerations, and deliberate
  deferrals. Review the diff for evidence that Notes were read and acted on.

### 3) Read relevant standards

Read the standards doc(s) for the affected scopes plus `.editorconfig`:

- Always read: `docs/coding-standards.md` (shared conventions)
- Backend scope: `docs/coding-standards-backend.md`
- Frontend scope: `docs/coding-standards-frontend.md`
- Backend Formatting rules: `src/.editorconfig`
- Frontend Formatting rules: `frontend/.editorconfig`

If a standards doc does not exist for the relevant scope, note it and skip.

### 4) Run automated checks

Run **all** checks applicable to the detected scopes. Record pass/fail and
capture the raw output (last ~50 lines per command) for the report.

Backend checks (always run when `src/` is changed):

```bash
dotnet build src/PanoramaMusic.sln 2>&1
dotnet format src/PanoramaMusic.sln --verify-no-changes 2>&1
find src -iname "*Tests*.csproj" -o -iname "*Test*.csproj" | sort -u | while read -r proj; do
  echo "--- Testing: $proj ---"
  dotnet test "$proj" 2>&1
done
```
>If no test projects are found under src/, note "No backend test projects found" in the report instead of a pass/fail line.

Frontend checks (run when `frontend/` is changed):

- Read `frontend/package.json` to discover available scripts.
- Run:
  - `npm run lint` if `lint` exists.
  - `npm run typecheck` if `typecheck` exists.
  - `npm run build` if `build` exists.
- If a `test` script exists, run:

```bash
npm run test
```

- Otherwise attempt:

```bash
npx vitest run --reporter=verbose 2>&1
```

- If Vitest is not configured, not installed, or the command is unavailable,
  skip gracefully and note it in the report.
- Do not install dependencies or tooling.

If none of the frontend checks produce meaningful output (e.g. no scripts
defined), note:

> No frontend checks configured

in the report.

### 5) Requirements and correctness review
Using the issue content extracted in step 2, review the diff against each requirement. For each section — ## Functional Requirements, ## API / Interface Contract, ## Domain & Data, ## Context & Constraints, ## Acceptance Criteria (G/W/T), and ## Notes — ask: does the diff satisfy this? Is there anything missing, wrong, or inconsistent?
Apply these severity levels to every finding:

❌ Blocker — the implementation is incorrect, incomplete, or violates an explicit requirement or constraint. Must be resolved before proceeding.
⚠️ Warning — a soft concern: a missing safeguard, a questionable pattern, or something that works now but is likely to cause problems.
❓ Question — something ambiguous, underspecified, or inconsistent that cannot be judged without clarification. Do not guess; raise it.
💡 Suggestion — an out-of-scope observation worth noting for a future issue.

>If a section (## Functional Requirements, ## API / Interface Contract, ## Domain & Data, ## Context & Constraints, ## Acceptance Criteria (G/W/T), or ## Notes) is absent or empty in the issue, note this explicitly in the report rather than skipping silently — use a 💡 Suggestion or ❓ Question depending on whether its absence is expected (e.g. a backend-only issue with no ## Domain & Data frontend content) or unexpected.

### 6) Standards review

For each file in the diff, systematically check every applicable rule in the
relevant standards doc. Treat each rule at face value — if the doc says
"always do X" and the code does Y, that is a violation regardless of intent.

- ❌ **Blocker** = clear violation of a documented rule.
- ⚠️ **Warning** = soft convention or subjective preference.
- Cite the doc and section for every finding.

### 7) Build the report

Construct the report from findings collected in steps 1–6. Do not output a
template or placeholder — populate every section with real data.

Use flat markdown headings and tables. Omit any section that has 0 items.

````markdown
## Verify Report — #{issue_number} — {issue_title}

**Automated checks:**
- dotnet build: {passed/failed}
- dotnet format: {passed/failed}
- dotnet test: {per-project pass/fail, e.g. "PanoramaMusic.Domain.Tests: 12/12 passed", or "No backend test projects found"}
- npm run lint: {passed/failed}
- npm run typecheck: {passed/failed}
- npm run build: {passed/failed}
- npm run test / vitest: {passed/failed}

### Requirements Verification

| Requirement | Status | Evidence |
|------------|--------|----------|
| AC1 | Implemented | File(s)/test(s)/diff evidence |
| AC2 | Implemented | File(s)/test(s)/diff evidence |
| TC1 | Covered | Test evidence |
| TC2 | Not verified | Reason |

### ❌ Blocker
| # | file:line | Category | Detail |
|---|-----------|----------|--------|
| 1 | Song.cs:42 | Standards | coding-standards-backend.md §2.1 — uses `class` instead of `record` |
| 2 | —          | Requirements | Functional requirement not addressed: "When X occurs, Y must happen" |

### ⚠️ Warning
(same structure)

### 💡 Suggestions
(same structure)

### ❓ Questions
| # | file:line | Question | Context |
|---|-----------|----------|---------|
| 1 | Song.cs:55 | Should ratings accept decimals or only integers? | Issue says "rating 1–5" but doesn't specify type |

### Automated check output
```text
dotnet build output (last ~50 lines)
dotnet format output (last ~50 lines)
dotnet test output (last ~50 lines)
npm lint output (last ~50 lines)
npm typecheck output (last ~50 lines)
npm build output (last ~50 lines)
npm test output (last ~50 lines)
```
````

Column rules:
- **file:line** — filename and line number, e.g. `Song.cs:42`. Use `—` for
  requirement-level findings with no single source line.
- **Category** — one word: Standards, Requirements, Correctness, Design, etc.
- **Detail** — cite the source (doc + section, or requirement text) and explain
  concisely.
- **Question / Context** — as before.

### 8) Present the report

Output the full report. Then ask:

> "Review complete. How do you want to proceed? You can:
> - fix specific items now
> - dismiss specific items (with a reason)
> - dismiss the entire report and proceed
> - re-run the review after making changes"

If the user fixes items, re-run steps 1–6 and present an updated report.

### 9) Summary

> "Verify complete for #{issue_number}. {n} blocker(s), {n} warning(s),
> {n} question(s), {n} suggestion(s)."

## Guardrails

- **Read-only.** Never modify files, GitHub issues, PRs, or any state.
- **Do not push, commit, or check out branches.** Only use `git diff`.
- **Every finding must cite a source** — issue section + requirement text,
  or doc + section, or file:line. If you cannot point to a specific source,
  it goes in Questions or Suggestions.
- **"I'm not sure" goes in Questions.** Do not guess.
- **If a standards doc does not exist** for the relevant scope, note it and
  skip.
- **Keep communication concise and direct.** No emojis except severity
  indicators.