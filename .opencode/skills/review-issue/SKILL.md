---
name: review-issue
description: >
  Load this skill when the user says "review issue", "review-issue", or
  "/review-issue". Reviews an implemented GitHub issue against its acceptance
  criteria and the project coding standards, acting as a critical tech-lead
  self-review pass before merging.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **review-issue**. Starting review..."

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the current session.
- `pr_number` (optional): prefer to infer from the PR created earlier in the current session.

If `issue_number` is not available, ask: "What is the issue number to review?"

## Goal

Perform a structured, critical review of the implementation for a given issue.
The review is **read-only** — never modify files or GitHub state. Produce a
report summarising all findings, grouped by severity, with every finding citing
its source (standard doc + section, or file:line).

## Procedure

### 0) Gather inputs

- Session-infer `issue_number` and optionally `pr_number`.
- If `issue_number` is missing, ask: "What is the issue number to review?"
- Do not proceed until confirmed.

### 1) Fetch issue and prepare workspace

```
gh issue view #{issue_number} --json title,body,milestone,labels,state
git branch --show-current
```

- Extract title, milestone (number + title), body.
- Extract all acceptance-criteria codes:
  - `## Epic Reference > Acceptance Criteria` → `[M?IT?]` codes
  - `## Acceptance Criteria (G/W/T)` → `[M?UC?]` codes
  - Note which subsection (`### Backend` / `### Frontend`) each UC lives under.
- Determine base branch:
  - With PR: `gh pr view #{pr_number} --json baseRefName,headRefName` → save `base_branch`, `feature_branch`.
  - Without PR: if branch starts with `feature/`, base is `master`. If `milestone/`, the milestone branch is the base.

### 2) Fetch diff

```
gh pr diff #{pr_number}   # if PR available
git fetch origin {base_branch} && git diff origin/{base_branch}...HEAD   # otherwise
```

- Capture full diff and changed file paths.
- Determine scopes: any path in `src/` → backend, `frontend/` → frontend.

### 3) Run automated checks

```
dotnet build 2>&1
dotnet test 2>&1
```

If any changed file is in `frontend/`:

```
npx vitest run --reporter=verbose 2>&1
```

- Record pass/fail per check. Capture output for the report.

### 4) Check branch sync

```
git fetch origin {base_branch}
git rev-list --count origin/{base_branch}..HEAD
git rev-list --count HEAD..origin/{base_branch}
```

- If behind > 0 → ⚠️ **Warning**: "Feature branch is N commit(s) behind origin/{base_branch}."

### 5) Verify acceptance criteria

For each code found in step 1:

**Backend (IT and UC):**
- `grep -r '\[Trait("AC", "CODE")\]' src/ --include="*.cs"`
- If found, run `dotnet test --filter "AC=CODE" --no-build`.
- Pass → ✅ Met. Fail → ❌ Blocker. Not found → ❌ Blocker.

**Frontend (UC only):**
- Search for the code in `frontend/src/services/__tests__/`.
- If found, run `npx vitest run --reporter=verbose` and check the specific test passes.
- Pass → ✅ Met. Fail → ❌ Blocker. Not found → ❌ Blocker.

Cross-reference `## Implementation Plan > Files to Create / Modify` against the
diff. Missing files → ⚠️ Warning.

### 6) Standards review

Read the relevant standards doc(s) for the affected scopes plus `.editorconfig`:

- Always read: `docs/coding-standards.md` (shared conventions)
- Backend scope: `docs/coding-standards-backend.md`
- Frontend scope: `docs/coding-standards-frontend.md`
- Formatting rules: `src/.editorconfig`

For each file in the diff, systematically check every applicable rule in the
relevant doc. Treat each rule at face value — if the doc says "always do X" and
the code does Y, that is a violation regardless of intent.

- ❌ **Blocker** = clear violation of a documented rule.
- ⚠️ **Warning** = soft convention or subjective preference.
- Cite the doc and section for every finding.

### 7) Correctness and design review

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

### 8) Build the report

Construct the report from findings collected in steps 1–7. Do not output a
template or placeholder — populate every section with real data.

Use flat markdown headings and tables. No `<details>` HTML tags. Omit any
section that has 0 items — empty sections are not rendered.

The structure:

```
## Review Report — #{issue_number} — {issue_title}

### Summary

| Category | ✅ Pass | ❌ Fail | ❌ Blocker | ⚠️ Warning | ❓ Question | 💡 Suggestion |
|---|---|---|---|---|---|---|
| Automated Checks | {pass}/{total} | {fail} | — | — | — | — |
| Acceptance Criteria | {pass}/{total} | {fail} | — | — | — | — |
| Coding Standards | {pass}/{total} | {fail} | — | — | — | — |
| Implementation | — | — | {n} | {n} | {n} | {n} |
| Branch Sync | — | — | — | {n} | — | — |
| **Total** | **{pass}/{total}** | **{fail}** | **{n}** | **{n}** | **{n}** | **{n}** |

### ❌ Blocker
| #  | Category | Detail |
|----|----------|--------|
| 1  | Standards | coding-standards-backend.md §2.1 — Song.cs uses `class` instead of `record` |

### ⚠️ Warning
(same table structure)

### ❓ Questions
| #  | Question | Context |
|----|----------|---------|
| 1  | Should ratings accept decimals or only integers? | Issue says "rating 1–5" but doesn't specify type |

### 💡 Suggestions
| #  | Category | Detail |
|----|----------|--------|
| 1  | Refactor | Extract rating validation to a ValueObject for reuse |

### ✅ Passed checks
| Category | Detail |
|----------|--------|
| Automated | dotnet build passed, dotnet test passed (41/41) |
| AC        | M1UC1 — CreateUser_WhenValid_SavesUser ✅ |

### Automated check output
```
dotnet build output (last ~50 lines)
dotnet test output (last ~50 lines)
```

### Next Steps
| Severity | Action | Count |
|----------|--------|-------|
| ❌ Blocker | Fix before merge | {n} |
| ⚠️ Warning | Recommended fix | {n} |
| ❓ Question | Needs human decision | {n} |
| 💡 Suggestion | Consider for future | {n} |
```

### 9) Present the report

Output the full report. Then ask:

> "How do you want to proceed with the above findings? You can:
> - fix specific items now
> - dismiss specific items (with a reason)
> - dismiss the entire report and proceed
> - re-run the review after making changes"

If the user fixes items, re-run steps 2–8 and present an updated report.

### 10) Summary

> "Review complete for #{issue_number}. {n} blocker(s), {n} warning(s), {n} question(s), {n} suggestion(s). {summary_of_disposition}"

## Guardrails

- **Read-only.** Never modify files, GitHub issues, PRs, or any state.
- **Do not push, commit, or check out branches.** Only use `git fetch` and `git diff`.
- **Every finding must cite a source** — doc + section, or file:line. If you
  cannot point to a specific rule, it goes in Questions or Suggestions.
- **"I'm not sure" goes in Questions.** Do not guess.
- **If a standards doc does not exist** for the relevant scope, note it and skip.
- **If no IT/UC codes are found** in the issue body, skip AC verification and note.
- **Keep communication concise and direct.** No emojis except severity indicators.
