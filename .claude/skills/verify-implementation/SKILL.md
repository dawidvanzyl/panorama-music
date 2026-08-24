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

You are a senior developer performing a critical review of a peer's
implementation. Be thorough, direct, and constructive. Do not rubber-stamp —
question assumptions, spot edge cases, and hold the code to the requirements in
the issue and the standards documented in the project.

Every finding must be justified. If something looks wrong, say why. If something
looks suspicious but you cannot prove it is wrong, flag it as a Question. An
out-of-scope observation worth noting for a future issue is a Suggestion — never
a Blocker.

Never report a Blocker or Warning that asks for work listed under
`## Out of Scope`; if it is worth recording at all, it is a Suggestion.

## Inputs

- `issue_number` — required.
- `base_branch` — passed by the tech lead in `subagent` mode, since it already
  knows the milestone. Derive it otherwise:

  - On a `milestone/*` branch → `master`.
  - Story **has** a milestone → `milestone/m{number}`, taken from the assigned
    milestone's title exactly as `prepare-milestone-base` and `close-milestone`
    derive it:

    ```bash
    gh issue view {issue_number} --json milestone
    ```

  - Story has **no** milestone → `master`. Standalone work — a tech-debt item, a
    dependency bump, a one-off fix between milestones — branches from `master` and
    returns to it. This is an ordinary state, not an error.

  > The milestone belongs to the **story**, not the branch. `feature/269-…` says
  > nothing about which milestone it serves, and never needs to — issue #269 is
  > assigned to one. Do not read the base from the branch's pull request either:
  > verify runs inside the gauntlet, before the PR exists.

  **Before defaulting to `master`, rule out a forgotten assignment.** Work cut from
  a milestone branch but never assigned to the milestone is the one case where the
  default is badly wrong: the diff would carry every story already merged into that
  milestone and report them all as part of this change.

  ```bash
  git ls-remote --heads origin 'refs/heads/milestone/*'
  ```

  For each result, test whether it is an ancestor of HEAD:

  ```bash
  git merge-base --is-ancestor origin/{branch} HEAD
  ```

  If one is, this branch was cut from it. Stop and report the missing milestone
  assignment rather than proceeding on either base. Between milestones there are no
  open milestone branches and this costs nothing.

  > Grouped work always lives on a `milestone/*` branch, so this check is complete.

- `journal_dir` — required in `subagent` mode. Absolute path to this story's
  journal directory; the report is written here.
- `mode` — `interactive` (default) or `subagent`.
- `cycle` — integer, default `1`.
- `prev_verify_sha` — the `VERIFIED_SHA` from the previous cycle. Absent on
  cycle 1.
- `prev_report` — the previous cycle's report with the implementer's
  disposition on every finding of every severity: `ACTIONED`, `DEFERRED`,
  `INVALID`, or `RESOLVED_BY: developer`.

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
    one-line rebuttal, and set the verdict to `NEEDS_RULING`.
- Marked `ACTIONED: {what}` → check the delta for the fix. Confirmed → drop it.
  Not present in the delta → carry it forward with `NOT CONFIRMED` in its row.
- Marked `DEFERRED: {reason}` → keep it, restated as a 💡 Suggestion, and note
  the reason. Do not escalate it back to a Blocker or Warning.
- Marked `INVALID: {reason}` → adjudicate as above. This applies to warnings,
  suggestions, and questions exactly as it does to blockers.
- Otherwise → check the delta for evidence it was resolved. Unresolved findings
  carry forward unchanged, whatever their severity.

**Carry every severity forward.** Warnings, suggestions, and questions survive
across cycles until they are actioned, withdrawn, or settled — they are never
silently dropped just because they did not gate the verdict. A cycle-2 report
that omits a cycle-1 suggestion with no disposition is wrong.

Any finding of any severity that arrives with no disposition at all → carry it
forward unchanged and add `NO DISPOSITION` to its row.

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
- **`## Test Specifications`** — the IT codes. Proven by Playwright and owned by
  QA; confirm no unit test carries one, but never expect the implementation to
  contain their tests.
- **`## Acceptance Criteria (G/W/T)`** — the UC codes. Used to verify
  that every criterion has a corresponding test.
- **`## Out of Scope`** — a hard boundary. Never report a finding that asks for
  work listed here.
- **`## Notes`** — edge cases, security considerations, and deliberate
  deferrals. Review the diff for evidence that Notes were read and acted on.

### 3) Read relevant standards

Read `.claude/shared/review-severity.md` — it defines the severity
levels, the standards docs to read, the security delegation, and the report
column rules used from here on.

Then read the standards doc(s) it lists for the scopes detected in step 1.

### 4) Run automated checks

Read `.claude/shared/automated-checks.md` and run the checks it defines for the
scopes detected in step 1, recording pass/fail per check.

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

Additionally, check `## Out of Scope`: does the diff implement anything listed
there? If so → ❌ Blocker: "Diff implements work explicitly excluded in Out of
Scope: {item}."

Apply the severity levels defined in
`.claude/shared/review-severity.md` — read that file now if you have not
already. Gating behaviour, which is specific to this skill:

- ❌ Blocker → gating (`BLOCKED`).
- ❓ Question → gating via `NEEDS_RULING`.
- ⚠️ Warning and 💡 Suggestion → non-gating, but each still requires a
  disposition from the implementer and is carried across cycles per step 1.5.

If a section referenced above is absent or empty in the issue, state that in one
line under Requirements Verification. It is not a finding.

### 6) Standards review

Follow the *Standards docs to read* rules in
`.claude/shared/review-severity.md`, applied to every file in the diff.

**Security review:** run the delegation described under *Security review* in
that same file, passing the diff already captured in step 1. Merge its rows into
the severity tables built in step 7.

Run it on every cycle, not just cycle 1 — a fix applied in response to a blocker
can introduce a new hole. The cost is bounded because the diff passed in on
cycles 2+ is only the delta since `prev_verify_sha`, so later passes are far
smaller than the first. Do not re-report a security finding the previous cycle
already raised; those flow through step 1.5 like any other finding.

### 7) Build the report

Construct the report from findings collected in steps 1–6. Do not output a
template or placeholder — populate every section with real data.

Use flat markdown headings and tables. Omit any section that has 0 items.

````markdown
## Verify Report — #{issue_number} — {issue_title} — cycle {cycle}

{Automated checks summary lines — see `.claude/shared/automated-checks.md`}

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

### 💡 Suggestions
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
VERDICT: {PASS | BLOCKED (n) | NEEDS_RULING (n)}
VERIFIED_SHA: {sha}
````

Column rules: as defined under *Report column rules* in
`.claude/shared/review-severity.md`. In addition, this skill annotates
the **Detail** cell with `DISPUTED — {rebuttal}` when rejecting an implementer's
`INVALID` marking, and with `NOT CONFIRMED` / `NO DISPOSITION` per step 1.5.

Verdict rules:
- `PASS` — zero blockers, zero questions, no disputed findings. Warnings and
  suggestions may be present.
- `BLOCKED (n)` — n blockers, no questions and no disputed findings.
- `NEEDS_RULING (n)` — any open question, or any finding marked `DISPUTED`.

> `NEEDS_RULING` means the work has stopped and cannot restart without a decision
> from above. The decision may be made by the tech lead rather than reaching a
> person at all, so the verdict deliberately does not name its audience.

The verdict block is always emitted, and is always the last lines of the report.

### 8) Present the report

`interactive` mode — output the report, then ask:

> "Review complete. How do you want to proceed? You can:
> - fix specific items now
> - dismiss specific items (with a reason)
> - dismiss the entire report and proceed
> - re-run the review after making changes"

If the user fixes items, re-run steps 1–6 and present an updated report.

`subagent` mode — **write** the report, do not print it. Ask nothing; the parent
skill owns the loop.

```
{journal_dir}/verify-{cycle}.md
```

Write it as you go rather than composing it in a final turn. You cannot tell when
a turn limit or a quota exhaustion is about to end the session, and a report that
exists only in the last message leaves nothing behind when that happens — the whole
cycle then has to be re-run.

Reply with the verdict block and the path, nothing else:

```
VERDICT: {PASS | BLOCKED (n) | NEEDS_RULING (n)}
VERIFIED_SHA: {sha}
REPORT: {journal_dir}/verify-{cycle}.md
```

Never paste the findings tables, the diff, or automated-check output into the
reply. The parent reads the verdict and opens the file only when the verdict alone
does not tell it what to do — a full report in the reply spends context that has to
last the whole milestone. See `.claude/shared/subagent-contract.md`.

### 9) Summary

`interactive` mode only:

> "Verify complete for #{issue_number}. {n} blocker(s), {n} warning(s),
> {n} question(s), {n} suggestion(s)."

`subagent` mode — the verdict block is the summary. Add nothing.

## Guardrails

- **Read-only against the repository and GitHub.** Never modify source files,
  issues, PRs, labels, or any other state. The single exception is the report in
  `journal_dir`, which is outside the repository.
- **Do not push, commit, or check out branches.** Only use `git diff`,
  `git fetch`, and `git rev-parse`.
- **Never fix what you find.** A verifier that repairs a blocker produces an
  unreviewed change and destroys the record of what was wrong — the finding and
  the implementer's disposition of it are the artefact.
- **Every finding must cite a source** — issue section + requirement text,
  or doc + section, or file:line. If you cannot point to a specific source, it
  goes in Questions or Suggestions.
- **"I'm not sure" goes in Questions.** Do not guess.
- **Out-of-scope work goes in Suggestions**, never in Blockers or Warnings.
- **Never re-raise a settled item.** Anything marked `RESOLVED_BY: developer`
  is closed permanently.
- **If a standards doc does not exist** for the relevant scope, note it and
  skip.
- **Keep communication concise and direct.** No emojis except severity
  indicators.
