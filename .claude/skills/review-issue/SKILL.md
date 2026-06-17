---
name: review-issue
description: >
  Load this skill when the user says "review issue", "review-issue", or
  "/review-issue". Reviews an implemented GitHub issue against its requirements
  and the project coding standards, acting as a critical tech-lead review pass
  before merging.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **review-issue**. Starting review..."

## Role

You are a senior developer performing a critical review of a peer's
implementation. Be thorough, direct, and constructive. Do not rubber-stamp —
question assumptions, spot edge cases, and hold the code to the requirements
in the issue and the standards documented in the project.

Every finding must be justified. If something looks wrong, say why. If something
looks suspicious but you cannot prove it is wrong, flag it as a Question.

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the
  current session.
- `pr_number` (optional): prefer to infer from the PR created earlier in the
  current session.

If `issue_number` is not available, ask: "What is the issue number to review?"

## Goal

Perform a structured, critical review of the implementation for a given issue.
The review is **read-only** — never modify files or GitHub state. Produce a
report summarising all findings, grouped by severity, with every finding citing
its source.

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
- Determine base branch:
  - With PR: `gh pr view #{pr_number} --json baseRefName,headRefName` → save
    `base_branch`, `feature_branch`.
  - Without PR: if branch starts with `feature/`, base is `master`. If
    `milestone/`, the milestone branch is the base.

### 2) Read the issue

Extract and internalize the following sections before reviewing any code.
These are the primary reference for whether the implementation is correct.

- **`## Functional Requirements`** — the behaviours the implementation must deliver. Used in step 7 to verify coverage.
- **`## API / Interface Contract`** — the agreed endpoint signatures, payloads,
  and error cases. Any deviation is a blocker.
- **`## Domain & Data`** — the entities, fields, and business rules in scope.
  Used to verify domain logic correctness.
- **`## Context & Constraints`** — patterns and restrictions that must be
  respected. Any violation is a blocker.
- **`## Notes`** — edge cases, security considerations, and deliberate
  deferrals. Review the diff for evidence that Notes were read and acted on.
- **`## Out of Scope`** — work explicitly excluded from this issue. Used in step 7 to confirm the diff does not implement anything listed here.

### 3) Fetch diff

```
gh pr diff #{pr_number}   # if PR available
git fetch origin {base_branch} && git diff origin/{base_branch}...HEAD   # otherwise
```

- Capture full diff and changed file paths.
- Determine scopes: any path in `src/` → backend, `frontend/` → frontend.

### 4) Run automated checks	

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

- Record pass/fail per check. Capture output for the report.

### 5) Check branch sync

```
git fetch origin {base_branch}
git rev-list --count origin/{base_branch}..HEAD
git rev-list --count HEAD..origin/{base_branch}
```

- If behind > 0 → ⚠️ **Warning**: "Feature branch is N commit(s) behind
  origin/{base_branch}."

### 6) Requirements and correctness review

Using the issue content extracted in step 2, review the diff against each requirement. For each section — ## Functional Requirements, ## API / Interface Contract, ## Domain & Data, ## Context & Constraints, and ## Notes — ask: does the diff satisfy this? Is there anything missing, wrong, or inconsistent?

Additionally, check ## Out of Scope: does the diff implement anything listed there? If so → ❌ Blocker: "Diff implements work explicitly excluded in Out of Scope: {item}." 

Apply these severity levels to every finding:

- **❌ Blocker** — the implementation is incorrect, incomplete, or violates an
  explicit requirement or constraint. Must be resolved before merging.
- **⚠️ Warning** — a soft concern: a missing safeguard, a questionable pattern,
  or something that works now but is likely to cause problems.
- **❓ Question** — something ambiguous, underspecified, or inconsistent that
  cannot be judged without clarification. Do not guess; raise it.
- **💡 Suggestion** — an out-of-scope observation worth noting for a future
  issue.

### 7) Standards review

Read the relevant standards doc(s) for the affected scopes plus `.editorconfig`:

- Always read: `docs/coding-standards.md` (shared conventions)
- Always read: `docs/security-standards.md` (security requirements — apply only rules relevant to the changed code; use the severity mapping in its Appendix)
- Backend scope: `docs/coding-standards-backend.md`
- Frontend scope: `docs/coding-standards-frontend.md`
- Backend Formatting rules: `src/.editorconfig`
- Frontend Formatting rules: `frontend/.editorconfig`

For each file in the diff, systematically check every applicable rule in the
relevant doc. Treat each rule at face value — if the doc says "always do X"
and the code does Y, that is a violation regardless of intent.

Use the same severity levels as step 6. Cite the doc and section for every
finding.

### 8) Build the report

Construct the report from findings collected in steps 1–7. Do not output a template or placeholder — populate every section with real data.

Use flat markdown headings and tables. No `<details>` HTML tags. Omit any
section that has 0 items.

```markdown
## Review Report — #{issue_number} — {issue_title}

### Summary

**Automated checks:**
- dotnet build: {passed/failed}
- dotnet format: {passed/failed}
- dotnet test: {per-project pass/fail, e.g. "PanoramaMusic.Domain.Tests: 12/12 passed", or "No backend test projects found"}
- npm run lint: {passed/failed}
- npm run typecheck: {passed/failed}
- npm run build: {passed/failed}
- npm run test / vitest: {passed/failed}

### ❌ Blocker
| # | file:line | Category | Detail |
|---|-----------|----------|--------|
| 1 | Song.cs:12 | Standards | coding-standards-backend.md §2.1 — uses `class` instead of `record` |
| 2 | —          | Requirements | Functional requirement not addressed: "When X occurs, Y must happen" |

### ⚠️ Warning
(same structure)

### 💡 Suggestions
(same structure)

### ❓ Questions
| # | file:line | Question | Context |
|---|-----------|----------|---------|
| 1 | Rating.cs:22 | Should ratings accept decimals or only integers? | Issue says "rating 1–5" but doesn't specify type |
```

Column rules:
- **file:line** — filename and line number, e.g. `Song.cs:42`. Use `—` for
  requirement-level findings with no single source line.
- **Category** — one word: Standards, Requirements, Correctness, Design, etc.
- **Detail** — cite the source (doc + section, or requirement text) and explain
  concisely.

### 9) Post feedback to PR

After presenting the report, ask:

> "Would you like to post these findings as comments on PR #{pr_number}?"

If **no**, skip to step 10.

If **yes**:

**A) Inline comments** — group findings by `file:line`. For each unique
file+line, batch all findings at that location into a single comment.

Get the latest commit SHA:
```
gh pr view #{pr_number} --json commits --jq '.commits[-1].oid'
```

For each unique `file:line` group:
```
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  -f body="❌ Blocker: Song.cs uses class instead of record §2.1
⚠️ Warning: Missing CancellationToken propagation

---
Generated by AI Reviewer" \
  -f commit_id="{latest_sha}" \
  -f path="Song.cs" \
  -f line=12
```

If a finding has a file but no line number, post a file-level inline comment
(omit the `line` field).

**B) General comment** — batch all remaining findings (no `file:line`) into a
single PR comment:

```
gh pr comment {pr_number} --body "## Review feedback for #{issue_number}

### ❌ Blockers
- {finding}

### ⚠️ Warnings
- ...

### 💡 Suggestions
- ...

### ❓ Questions
- ...

---
Generated by AI Reviewer"
```

Post a confirmation: "Posted {n} inline comment(s) and 1 general comment to
PR #{pr_number}."

### 10) Summary

> "Review complete for #{issue_number}. {n} blocker(s), {n} warning(s),
> {n} question(s), {n} suggestion(s). {summary_of_disposition}"

## Guardrails

- **Do not modify files, branches, or issue state.** Only write PR comments
  when the user explicitly approves in step 10.
- **Do not resolve existing PR comments.** Fresh posts only.
- **Do not push, commit, or check out branches.** Only use `git fetch` and
  `git diff`.
- **Every finding must cite a source** — issue section + requirement text, or
  doc + section, or file:line. If you cannot point to a specific source, it
  goes in Questions or Suggestions.
- **"I'm not sure" goes in Questions.** Do not guess.
- **If a standards doc does not exist** for the relevant scope, note it and
  skip.
- **Keep communication concise and direct.** No emojis except severity
  indicators.