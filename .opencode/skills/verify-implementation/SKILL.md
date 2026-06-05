---
name: verify-implementation
description: >
  Load this skill when the user says "verify-implementation", "verify
  implementation", or "/verify-implementation". Reviews uncommitted working-tree
  changes against project coding standards, runs automated checks, and produces
  a simplified report before acceptance criteria are ticked off.
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
hold the code to the standards documented in the project.

Every finding must be justified. If something looks wrong, say why. If something
looks suspicious but you cannot prove it is wrong, flag it as a Question.

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the current session.

If `issue_number` is not available, ask: "What is the issue number to verify?"

## Goal

Review the **uncommitted working-tree changes** made during an implementation
session. Run automated checks, review against coding standards, and inspect for
correctness and design issues. Produce a **simplified report** grouped by
severity, with every finding citing its source.

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

### 2) Read relevant standards

Read the standards doc(s) for the affected scopes plus `.editorconfig`:

- Always read: `docs/coding-standards.md` (shared conventions)
- Backend scope: `docs/coding-standards-backend.md`
- Frontend scope: `docs/coding-standards-frontend.md`
- Formatting rules: `src/.editorconfig`

If a standards doc does not exist for the relevant scope, note it and skip.

### 3) Run automated checks

Run **all** checks applicable to the detected scopes. Record pass/fail and
capture the raw output (last ~50 lines per command) for the report.

Backend checks (always run when `src/` is changed):

```
dotnet build src/PanoramaMusic.sln 2>&1
dotnet format src/PanoramaMusic.sln --verify-no-changes 2>&1
dotnet test src/PanoramaMusic.Tests 2>&1
```

Frontend checks (run when `frontend/` is changed):

- Read `frontend/package.json` to discover available scripts (`lint`, `typecheck`, `build`).
- Run discovered scripts: `npm run lint`, `npm run typecheck`, `npm run build` (only those defined).
- Try `npx vitest run --reporter=verbose 2>&1` — if vitest is not configured (config missing or command fails), skip gracefully and note it in the report.
- If vitest is not installed, do not install it — just note it.

If none of the frontend checks produce meaningful output (e.g. no scripts
defined), note "No frontend checks configured" in the report.

### 4) Standards review

For each file in the diff, systematically check every applicable rule in the
relevant doc. Treat each rule at face value — if the doc says "always do X" and
the code does Y, that is a violation regardless of intent.

- ❌ **Blocker** = clear violation of a documented rule.
- ⚠️ **Warning** = soft convention or subjective preference.
- Cite the doc and section for every finding.

### 5) Correctness and design review

Read the full diff critically. Flag issues no standards doc would cover:

**❌ Blockers:** logic errors, parameter mismatches between SQL functions and
C# code, missing null/error handling that will crash, hardcoded values that
must be configurable, route/method mismatches with the issue, missing
migrations for schema changes, breaking API contract changes, missing
CancellationToken propagation.

**⚠️ Warnings:** missing guard clauses, empty catch blocks, overly broad
catches, missing input validation, magic numbers/strings, large methods
that should be split, duplicate code, missing resource disposal.

**❓ Questions:** ambiguous or underspecified behaviour in the issue, design
decisions inconsistent with existing patterns, API contract changes that may
affect consumers, undocumented assumptions, unaddressed edge cases.

**💡 Suggestions:** out-of-scope follow-ups, refactoring opportunities,
performance considerations for future milestones.

### 6) Build the report

Construct the report from findings collected in steps 1–5. Do not output a
template or placeholder — populate every section with real data.

Use flat markdown headings and tables. Omit any section that has 0 items —
empty sections are not rendered.

The structure:

````markdown
## Verify Report — #{issue_number} — {issue_title}

**Automated checks:**
- dotnet build: {passed/failed}
- dotnet format: {passed/failed}
- dotnet test: {n}/{n}

### ❌ Blocker
| # | file:line | Category | Detail |
|---|-----------|----------|--------|
| 1 | Song.cs:42 | Standards | coding-standards-backend.md §2.1 — Song.cs uses `class` instead of `record` |

### ⚠️ Warning
(same structure: | # | file:line | Category | Detail |)

### 💡 Suggestions
(same structure: | # | file:line | Category | Detail |)

### ❓ Questions
| # | file:line | Question | Context |
|---|-----------|----------|---------|
| 1 | Song.cs:55 | Should ratings accept decimals or only integers? | Issue says "rating 1–5" but doesn't specify type |

### Automated check output
```text
dotnet build output (last ~50 lines)
dotnet format output (last ~50 lines)
dotnet test output (last ~50 lines)
```
````

Column rules:
- **file:line** — filename and line number where the issue was found, e.g. `Song.cs:42`.
- **Category** in Blocker/Warning/Suggestions tables: one word describing the domain (Standards, Design, Correctness, etc.)
- **Detail** in Blocker/Warning/Suggestions tables: cite the doc + section, and explain concisely.
- **Question** column in Questions table: the open question.
- **Context** column in Questions table: why it matters / what triggered it.

### 7) Present the report

Output the full report. Then ask:

> "Review complete. How do you want to proceed? You can:
> - fix specific items now
> - dismiss specific items (with a reason)
> - dismiss the entire report and proceed
> - re-run the review after making changes"

If the user fixes items, re-run steps 1–6 and present an updated report.

### 8) Summary

> "Verify complete for #{issue_number}. {n} blocker(s), {n} warning(s), {n} question(s), {n} suggestion(s)."

## Guardrails

- **Read-only.** Never modify files, GitHub issues, PRs, or any state.
- **Do not push, commit, or check out branches.** Only use `git diff`.
- **Every finding must cite a source** — doc + section, or file:line. If you
  cannot point to a specific rule, it goes in Questions or Suggestions.
- **"I'm not sure" goes in Questions.** Do not guess.
- **If a standards doc does not exist** for the relevant scope, note it and skip.
- **Keep communication concise and direct.** No emojis except severity indicators.
