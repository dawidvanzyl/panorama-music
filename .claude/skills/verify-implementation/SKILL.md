---
name: verify-implementation
description: >
  Load this skill when the user says "verify-implementation", "verify
  implementation", or "/verify-implementation". Reviews the implementation
  against the issue requirements and project coding standards, runs automated
  checks, and produces a gated report before acceptance criteria are ticked off.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: implement-issue-integration
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **verify-implementation**. Starting review..."

## Role

You are a senior developer verifying that an implementation satisfies the issue
it was written for. Your scope is the issue — not the codebase at large, and not
what the code could become.

Every finding must quote the text it violates: an issue section, a standards
rule, or a failing check. If you cannot quote a source, it is not a finding.

Do not report: refactors the issue did not ask for, performance not specified in
the issue, test coverage beyond the UC/IT codes, naming or style not covered by
a standards doc, anything under `## Out of Scope`, or anything that would
properly be a separate issue. These are the failure mode this skill exists to
avoid — a clean report on a correct implementation is the expected outcome, not
a sign you reviewed lazily.

## Inputs

- `issue_number` — required.
- `base_branch` — required in `subagent` mode; inferred from the branch prefix
  otherwise (`feature/`, `bug/`, `tech-debt/` → `master`; `milestone/` → the
  milestone branch).
- `mode` — `interactive` (default) or `subagent`.
- `cycle` — integer, default `1`.
- `prev_verify_sha` — the `VERIFIED_SHA` from the previous cycle. Absent on
  cycle 1.
- `prev_report` — the previous cycle's report, including any items marked
  invalid by the implementer and any items marked `RESOLVED_BY: developer`.

If `issue_number` is not available, ask: "What is the issue number to verify?"

`interactive` mode always runs cycle-1 behaviour.

## Goal

Review the implementation made for the issue. Run automated checks, review
against the issue requirements and coding standards, and inspect for correctness
and contract compliance. Produce a report grouped by severity, with every
finding citing its source, ending in a machine-readable verdict.

## Procedure

### 0) Gather inputs

- Session-infer `issue_number` if not passed.
- If `issue_number` is missing, ask: "What is the issue number to verify?"
- Do not proceed until confirmed.

### 1) Capture changes and determine scope

Cycle 1 (no `prev_verify_sha`) — review the full branch:

```
git fetch origin {base_branch}
git diff origin/{base_branch}...HEAD
git diff HEAD
git rev-parse HEAD
```

Cycles 2+ — review only the delta since the last verify:

```
git diff {prev_verify_sha}..HEAD
git diff HEAD
git rev-parse HEAD
```

Review the union of the committed and working-tree diffs. Record the current
SHA for `VERIFIED_SHA`.

- Determine scopes: any path in `src/` → backend, `frontend/` → frontend.

### 1.5) Prior findings (cycles 2+ only)

Skip on cycle 1.

Read `prev_report`. For each finding:

- Marked `RESOLVED_BY: developer` → settled. Do not re-raise, do not re-assess.
- Marked invalid by the implementer with a reason → adjudicate it. Weigh the
  reason against the issue text and standards you cited originally.
  - Reason holds → drop the finding. Record it under Withdrawn.
  - Reason does not hold → keep the finding, add `DISPUTED` to its row with a
    one-line rebuttal, and set the verdict to `NEEDS_HUMAN`.
- Otherwise → check the delta for evidence it was resolved. Unresolved findings
  carry forward unchanged.

On cycles 2+, do not re-run the full requirements sweep from step 5. Confirm
prior findings and check the delta for new violations only.

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
- **`## Out of Scope`** — a hard boundary. Never report a finding that asks for
  work listed here.
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

Run **all** checks applicable to the detected scopes. Record pass/fail.

Backend checks (always run when `src/` is changed):

```bash
dotnet build src/PanoramaMusic.slnx 2>&1
dotnet format src/PanoramaMusic.slnx --verify-no-changes 2>&1
find src -iname "*Tests*.csproj" -o -iname "*Test*.csproj" | sort -u | while read -r proj; do
  echo "--- Testing: $proj ---"
  dotnet test "$proj" 2>&1
done
```

> If no test projects are found under `src/`, note "No backend test projects
> found" in the report instead of a pass/fail line.

Frontend checks (run when `frontend/` is changed):

- Read `frontend/package.json` to discover available scripts.
- Run:
  - `npm run lint` if `lint` exists.
  - `npm run format:check` if `format:check` exists.
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

**Short-circuit.** If any automated check fails, stop here. Emit a report
containing only the check results, the failing output (last ~50 lines per
failing command), and:

```
VERDICT: BLOCKED (1)
VERIFIED_SHA: {sha}
```

Do not perform steps 5–6. A broken build cannot be reviewed meaningfully.

### 5) Requirements and correctness review

Using the issue content extracted in step 2, review the diff against each
requirement. For each section — `## Functional Requirements`,
`## API / Interface Contract`, `## Domain & Data`, `## Context & Constraints`,
`## Acceptance Criteria (G/W/T)`, and `## Notes` — ask: does the diff satisfy
this? Is there anything missing, wrong, or inconsistent?

Apply these severity levels. Every finding quotes its source.

❌ **Blocker** — the diff fails a requirement, deviates from the API / interface
contract, breaks a rule in `## Context & Constraints` or `## Domain & Data`,
misses a UC/IT test, or violates a documented standards rule. Quote the text it
violates. Gating.

⚠️ **Warning** — a concrete risk you can describe but cannot cite: a missing
safeguard, a fragile pattern, an unhandled edge case. Non-gating; reported for
the implementer's judgement. If you can cite a source, it is a Blocker, not a
Warning. If you cannot describe a concrete failure it would cause, it is not a
finding at all.

❓ **Question** — genuine ambiguity. Before raising one, attempt resolution from
the issue, the existing codebase, and the standards docs. Raise it only if all
three are silent and guessing wrong would produce incorrect behaviour. Gating
via `NEEDS_HUMAN`.

If a section referenced above is absent or empty in the issue, state that in one
line under Requirements Verification. It is not a finding.

### 6) Standards review

For each file in the diff, systematically check every applicable rule in the
relevant standards doc. Treat each rule at face value — if the doc says
"always do X" and the code does Y, that is a violation regardless of intent.

- ❌ **Blocker** = violation of a documented rule. Cite doc + section.
- Undocumented style preferences are not findings. Do not report them.

### 7) Build the report

Construct the report from findings collected in steps 1–6. Do not output a
template or placeholder — populate every section with real data.

Use flat markdown headings and tables. Omit any section that has 0 items.

````markdown
## Verify Report — #{issue_number} — {issue_title} — cycle {cycle}

**Automated checks:**
- dotnet build: {passed/failed}
- dotnet format: {passed/failed}
- dotnet test: {per-project pass/fail, e.g. "PanoramaMusic.Domain.Tests: 12/12 passed", or "No backend test projects found"}
- npm run lint: {passed/failed}
- npm run format:check: {passed/failed}
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
(same structure; non-gating)

### ❓ Questions
| # | file:line | Question | Context |
|---|-----------|----------|---------|
| 1 | Song.cs:55 | Should ratings accept decimals or only integers? | Issue says "rating 1–5" but doesn't specify type |

### Withdrawn (cycles 2+)
| # | Finding | Implementer reason | Outcome |
|---|---------|--------------------|---------|

### Automated check output
```text
Include raw output only for checks that FAILED (last ~50 lines each).
Omit this section entirely if all checks passed.
```

---
VERDICT: {PASS | BLOCKED (n) | NEEDS_HUMAN (n)}
VERIFIED_SHA: {sha}
````

Column rules:
- **file:line** — filename and line number, e.g. `Song.cs:42`. Use `—` for
  requirement-level findings with no single source line.
- **Category** — one word: Standards, Requirements, Correctness, Contract.
- **Detail** — quote the source (doc + section, or requirement text) and explain
  concisely. Add `DISPUTED — {rebuttal}` when rejecting an implementer's
  invalid-marking.

Verdict rules:
- `PASS` — zero blockers, zero questions, no disputed findings. Warnings may be
  present.
- `BLOCKED (n)` — n blockers, no questions and no disputed findings.
- `NEEDS_HUMAN (n)` — any open question, or any finding marked `DISPUTED`.

The verdict block is the last two lines of the report. Always emit it.

### 8) Present the report

`interactive` mode — output the report, then ask:

> "Review complete. How do you want to proceed? You can:
> - fix specific items now
> - dismiss specific items (with a reason)
> - dismiss the entire report and proceed
> - re-run the review after making changes"

If the user fixes items, re-run steps 1–6 and present an updated report.

`subagent` mode — output the report and stop. Ask nothing. The parent skill
owns the loop.

### 9) Summary

`interactive` mode only:

> "Verify complete for #{issue_number}. {n} blocker(s), {n} warning(s),
> {n} question(s)."

`subagent` mode — the verdict block is the summary. Add nothing.

## Guardrails

- **Read-only.** Never modify files, GitHub issues, PRs, or any state.
- **Do not push, commit, or check out branches.** Only use `git diff`,
  `git fetch`, and `git rev-parse`.
- **Every finding must cite a source** — issue section + requirement text,
  or doc + section, or file:line. If you cannot point to a specific source,
  it is a Warning only if you can describe a concrete failure, otherwise it is
  not a finding.
- **"I'm not sure" goes in Questions** — but only after checking the issue, the
  codebase, and the standards docs. Ambiguity resolvable by reading two existing
  files is not a Question.
- **Never widen scope.** A correct implementation with no findings is a valid
  and expected result.
- **Never re-raise a settled item.** Anything marked `RESOLVED_BY: developer`
  is closed permanently.
- **If a standards doc does not exist** for the relevant scope, note it and
  skip.
- **Keep communication concise and direct.** No emojis except severity
  indicators.
