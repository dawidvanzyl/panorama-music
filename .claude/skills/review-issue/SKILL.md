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
- `pr_number`: optional in `interactive` mode; **required** in `subagent` mode —
  there is nothing to approve or comment on without it.
- `journal_dir`: required in `subagent` mode. Absolute path to this story's journal
  directory.
- `mode`: `interactive` (default) or `subagent`.

`interactive` — if `issue_number` is not available, ask: "What is the issue number
to review?"

`subagent` — every required input arrives in the brief. If one is missing, report
`BLOCKED (1)` naming it. Never ask: a background worker has no interactive turn for
an answer to arrive in, so a question is a hang rather than a pause.

## Goal

Perform a structured, critical review of the implementation for a given issue, and
decide whether the pull request is clean enough to merge.

**You never change the code.** The path guard refuses writes across `src/`,
`frontend/` and `e2e/`, and that boundary is the point: a reviewer who fixes what
they find produces an unreviewed change and destroys the record of what was wrong.
The finding, and the developer's response to it, are the artefact.

What you do write: comments on the pull request, an approval when nothing is
outstanding, the `gate: reviewer-approved` label, and your report in `journal_dir`.

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
    `base_branch`, `feature_branch`. Authoritative — always prefer it.
  - Without PR: on a `milestone/*` branch the base is `master`; otherwise derive it
    from the **story's assigned milestone** (`gh issue view {issue_number} --json
    milestone` → `milestone/m{number}`), and `master` if the story has none.

  > Branch prefixes do not decide this. Story branches target the milestone branch,
  > not `master`, and `feature/269-…` says nothing about which milestone it serves —
  > issue #269 does.

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

### 4) Automated checks — prefer CI

`ci.yml` runs the backend build, tests and format check, the frontend lint,
typecheck, build and tests, and the full Playwright suite on **every push** to a
pull request. When that has already run against the head commit, re-running it
locally proves nothing new and costs minutes on every review pass.

```bash
gh pr checks {pr_number}
gh pr view {pr_number} --json commits --jq '.commits[-1].oid'
```

- **Checks completed against the head commit** — use their result. Record pass/fail
  per check for the report and fetch logs only for failures.
- **Checks pending, absent, or run against an older commit, or no PR at all** — run
  the checks in `.claude/shared/automated-checks.md` locally for the scopes detected
  in step 3, recording pass/fail and capturing output.

Confirm the SHA the checks ran against matches the head commit. A green tick on a
superseded commit is not evidence about the code you are reviewing.

A failing check is a ❌ Blocker either way.

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

Read `.claude/shared/review-severity.md` and apply the severity levels it
defines. That file also carries the standards-doc list, the security
delegation, and the report column rules used in steps 7 and 8.

### 7) Standards review

Follow the *Standards docs to read* rules in
`.claude/shared/review-severity.md`, applied to every file in the diff.

**Security review:** run the delegation described under *Security review* in
that same file, passing the diff already captured in step 3 (do not re-fetch
it). Merge its rows into the severity tables built in step 8.

### 8) Build the report

Construct the report from findings collected in steps 1–7. Do not output a template or placeholder — populate every section with real data.

Use flat markdown headings and tables. No `<details>` HTML tags. Omit any
section that has 0 items.

```markdown
## Review Report — #{issue_number} — {issue_title}

### Summary

{Automated checks summary lines — see `.claude/shared/automated-checks.md`}

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

Column rules: as defined under *Report column rules* in
`.claude/shared/review-severity.md`.

### 8.5) What is not yours to review

**Test correctness is not your call.** The E2E specs were designed before the code
existed and QA has already signed them off against that frozen design.

If you believe a spec is wrong, escalate to the tech lead. Do **not** raise it as a
PR finding: the developer is forbidden to edit `e2e/` by a hook, so a comment asking
them to change a spec is an instruction to do the one thing they cannot do, and the
story deadlocks on a contradiction neither agent can resolve.

Watch also for these, which recur in this codebase:

- Per-row repository calls inside a loop — always a ⚠️ Warning; the fix is a
  purpose-built joining query, not a cache.
- Comments that restate control flow already visible in the code — do not ask for
  them.
- Documentation lagging the implementation where no code change follows. That is
  bookkeeping, not a review finding.

### 9) Post feedback to PR

- `interactive` — after presenting the report, ask:

  > "Would you like to post these findings as comments on PR #{pr_number}?"

  If **no**, skip to step 10.

- `subagent` — post without asking. Findings the developer cannot see are findings
  that cost a review pass and changed nothing.

To post:

Replace `{claude_model_name}` below with the display name of the Claude model
currently running this skill (e.g. "Claude Sonnet 5").

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
Generated by {claude_model_name}" \
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
Generated by {claude_model_name}"
```

Post a confirmation: "Posted {n} inline comment(s) and 1 general comment to
PR #{pr_number}."

### 9.5) Approve, or return it

Approval is one of the three inputs the tech lead needs at the merge gate, and it
claims exactly one thing: **nothing is left outstanding on this pull request.**

Approve only when **all** of these hold:

1. **No finding of yours is unresolved** — from this pass or any earlier one. A
   finding the developer disputed counts as resolved only once the dispute was
   settled, not merely answered.

   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --jq '.[] | {path, line, body}'
   ```

2. **No bug sub-issue raised against this story is still open.**

   ```bash
   gh issue view {issue_number} --json title,body
   ```

   Check the story's linked sub-issues for open `[Bug]` items.

3. **No review thread is awaiting a reply.**

4. **QA has signed off** — `gate: qa-complete` is on the pull request.

   ```bash
   gh pr view {pr_number} --json labels
   ```

   If it is absent, you are reviewing ahead of QA. Say so and stop rather than
   approving: an approval on an untested branch collapses the lead's three
   independent inputs into two, and the missing one is the only evidence that the
   code does what the story asked.

5. **CI is green against the head commit** (step 4).

When all hold:

```bash
gh pr review {pr_number} --approve --body "..."
gh pr edit {pr_number} --add-label "gate: reviewer-approved"
```

The label is what the tech lead reads at the merge gate, and it is what survives if
this session dies before your report is read.

**Never merge, and never close the issue.** The decision that the story is done
belongs to the tech lead, made from your approval, QA's sign-off and the owner's
together. Your job is to make that decision safe to take, not to take it.

### 10) Summary

`interactive`:

> "Review complete for #{issue_number}. {n} blocker(s), {n} warning(s),
> {n} question(s), {n} suggestion(s). {summary_of_disposition}"

`subagent` — write the report to `{journal_dir}/review-{cycle}.md` **as you go**,
then reply with the verdict block only, per `.claude/shared/subagent-contract.md`:

```
VERDICT: {APPROVED | FINDINGS (n) | NEEDS_RULING (n)}
REPORT: {journal_dir}/review-{cycle}.md
PR: {pr_number}
```

`FINDINGS (n)` is an ordinary outcome, not a failure — it means the review worked
and the story returns to the developer. Never soften a real finding to report
`APPROVED`; the verdict is read as a gate, and a false one merges code nobody
checked.

Never paste the report, the diff, or check output into the reply.

## Guardrails

- **Never modify code.** No writes to `src/`, `frontend/` or `e2e/` — the path
  guard refuses them, and fixing what you find destroys the record of what was
  wrong. You may write PR comments, an approval, the `gate: reviewer-approved`
  label, and your report in `journal_dir`. Nothing else.
- **Never merge, and never close an issue.**
- **Never approve ahead of QA**, and never approve with an open finding, an open
  bug sub-issue, an unanswered thread, or red CI.
- **Never raise a spec change as a PR finding.** The developer cannot act on it.
  Escalate to the tech lead instead.
- **Do not resolve existing PR comments.** Fresh posts only.
- **Never ask a question in `subagent` mode** — escalate instead.
- **Calibrate for a loop, not a person.** The developer acting on your findings has
  no way to weigh whether a round trip is worth it; that judgement is yours, made
  here. Every marginal finding costs an edit, a re-review, and another pass — and
  the loop is what the quota is actually spent on.
- **Do not push, commit, or check out branches.** Only use `git fetch` and
  `git diff`.
- **Every finding must cite a source** — issue section + requirement text, or
  doc + section, or file:line. If you cannot point to a specific source, it
  goes in Questions or Suggestions.
- **"I'm not sure" goes in Questions.** Do not guess.
- **Non-gating is not optional.** Warnings, suggestions, and questions are all
  expected to be evaluated and answered or actioned if valid — say so in the
  step 10 disposition rather than letting them lapse.
- **If a standards doc does not exist** for the relevant scope, note it and
  skip.
- **Keep communication concise and direct.** No emojis except severity
  indicators.