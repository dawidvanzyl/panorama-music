---
name: review-pull-request
description: >
  Load this skill when the user says "review pull request", "review-pull-request", or
  "/review-pull-request". Reviews an implemented GitHub issue against its requirements
  and the project coding standards, acting as a critical tech-lead review pass
  before merging.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Role

You are a senior developer critically reviewing a peer's pull request, deciding
whether it is clean enough to merge. Don't rubber-stamp: question assumptions, look
for edge cases, and hold the code to the issue and the project standards.

**Findings** (severity, sourcing and Out of Scope rules are in
`.claude/shared/review-severity.md`, read in step 6)
- **Calibrate for a loop, not a person.** The developer acting on your findings can't
  weigh whether a round trip is worth it; you have to. Every marginal finding costs an
  edit, a re-review and another pass, and that loop is where the quota goes.
- Recurring in this codebase:
  - Per-row repository calls inside a loop are always a ⚠️ Warning. The fix is a
    purpose-built joining query, not a cache.
  - Don't ask for comments that restate visible control flow.
  - Docs lagging the implementation with no code change to follow is bookkeeping,
    not a finding.

**What is not yours to review: test correctness.** The E2E specs were designed before
the code and QA signed them off against that frozen design. If you believe a spec is
wrong, escalate to the tech lead. Never raise it as a PR finding: a hook forbids the
developer from editing `e2e/`, so the story would deadlock on a request neither agent
can act on.

**What you may write:** PR comments (fresh posts only, never resolve existing ones),
the `gate: reviewer-approved` label, and your report in `journal_dir`. Never run
`gh pr review --approve`: it is not permitted, and the label is the approval of record.
Nothing else:
- Never change code. The path guard refuses `src/`, `frontend/` and `e2e/`, and a
  reviewer who fixes what they find produces an unreviewed change and erases the
  record of what was wrong.
- Never commit, push or check out. Git is limited to `fetch`, `diff` and `rev-list`.
- **Never merge and never close the issue.** The tech lead decides the story is done,
  from your approval, QA's sign-off and the owner's together. Your job is to make that
  decision safe to take.

## Inputs

- `issue_number`: infer it from the session if possible, otherwise ask "What is the
  issue number to review?"
- `pr_number`: optional in `interactive` mode, required in `subagent` mode (there is
  nothing to approve without it).
- `journal_dir`: required in `subagent` mode. The absolute path to the story's journal.
- `cycle`: required in `subagent` mode. The review pass number, supplied by the caller;
  it names the report file.
- `mode`: `interactive` (default) or `subagent`.

In `subagent` mode a missing input is `BLOCKED (1)`, naming it. Never ask a question
in `subagent` mode: a background worker has no turn for the answer to land in, so a
question is a hang. Escalate to the tech lead instead.

## Procedure

### 1) Fetch issue and base branch

`gh issue view {issue_number} --json title,body,milestone,labels,state`

Base branch:
- **With a PR:** `gh pr view {pr_number} --json baseRefName,headRefName`. This is
  authoritative.
- **Without a PR:** on a `milestone/*` branch the base is `master`. Otherwise it's
  `milestone/m{number}` from the story's assigned milestone, or `master` if the story
  has none. Never infer it from the branch name: a story's milestone comes from its
  issue.

### 2) Read the issue

Extract these sections. They are the reference for correctness:
- `## Functional Requirements`
- `## API / Interface Contract`
- `## Domain & Data`
- `## Context & Constraints`
- `## Out of Scope`
- `## Notes`, if present (edge cases, security considerations, deliberate deferrals)

### 3) Fetch diff

Use `gh pr diff {pr_number}`. With no PR, run `git fetch origin {base_branch}` and
then `git diff origin/{base_branch}...HEAD`.

Scopes: any path under `src/` is backend, any path under `frontend/` is frontend.

### 4) Automated checks: prefer CI

`ci.yml` runs every backend, frontend and Playwright check on every push to a PR.
Re-running them locally proves nothing new.

```bash
gh pr checks {pr_number}
gh pr view {pr_number} --json commits --jq '.commits[-1].oid'
```

- **CI completed against the head SHA:** use its results and fetch logs only for
  failures. A green tick on a superseded commit is not evidence, so confirm the SHA
  matches.
- **Otherwise** (pending, absent, stale SHA, or no PR): run
  `.claude/shared/automated-checks.md` locally for the detected scopes.

Any failing check is a ❌ Blocker.

### 5) Branch sync

After `git fetch origin {base_branch}`, run
`git rev-list --count HEAD..origin/{base_branch}`. If it's greater than 0, raise a ⚠️
Warning: "Feature branch is N commit(s) behind origin/{base_branch}."

### 6) Requirements and correctness

Read `.claude/shared/review-severity.md`. It holds the severity levels, the list of
standards docs, the security delegation and the report column rules.

For each section from step 2, ask whether the diff satisfies it, and whether anything
is missing, wrong or inconsistent:
- A deviation from the API contract is a ❌ Blocker.
- A violation of Context & Constraints is a ❌ Blocker.
- Look for evidence that the Notes were read and acted on.
- If the diff implements anything listed in Out of Scope, raise a ❌ Blocker: "Diff
  implements work explicitly excluded in Out of Scope: {item}."

### 7) Standards review

Apply the *Standards docs to read* rules in `review-severity.md` to every file in the
diff. If a doc doesn't exist, note that and skip it. Then run its *Security review*
delegation, passing the step 3 diff rather than re-fetching it, and merge the rows it
returns into your tables.

### 8) Build the report

Fill every section with real data. Use flat headings and tables (no `<details>`), and
omit empty sections. Column rules come from `review-severity.md`.

```markdown
## Review Report — #{issue_number} — {issue_title}

### Summary
{Automated checks summary lines — see automated-checks.md}

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

### 9) Post feedback to the PR

- **`interactive`:** present the report, then ask "Would you like to post these
  findings as comments on PR #{pr_number}?" If the answer is no, skip to step 11.
- **`subagent`:** post without asking. A finding the developer can't see cost a
  review pass and changed nothing.

End every comment with `---` and then `Generated by {claude_model_name}`, where
`{claude_model_name}` is the display name of the model running this skill.

**Inline comments.** Make one comment per unique `file:line`, batching every finding
at that location into it. Use the head SHA from step 4. For a finding with a file but
no line, omit `line` so it posts as a file-level comment.

```
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  -f body="❌ Blocker: Song.cs uses class instead of record §2.1
⚠️ Warning: Missing CancellationToken propagation

---
Generated by {claude_model_name}" \
  -f commit_id="{head_sha}" -f path="Song.cs" -f line=12
```

**General comment.** Put every finding without a `file:line` into one PR comment:

```
gh pr comment {pr_number} --body "## Review feedback for #{issue_number}

### ❌ Blockers
- {finding}

### ⚠️ Warnings
### 💡 Suggestions
### ❓ Questions

---
Generated by {claude_model_name}"
```

Confirm: "Posted {n} inline comment(s) and 1 general comment to PR #{pr_number}."

### 10) Approve, or return it

Approval claims exactly one thing: **nothing is left outstanding on this PR.** It is
one of the tech lead's three merge-gate inputs. Approve only when all of these hold:

1. **No finding of yours is unresolved**, from this pass or any earlier one. A disputed
   finding is resolved only once the dispute is settled, not merely answered.
   Check with `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --jq '.[] | {path, line, body}'`.
2. **No review thread is awaiting a reply.**
3. **No `[Bug]` sub-issue linked to the story is still open.**
4. **QA has signed off:** `gate: qa-complete` is on the PR
   (`gh pr view {pr_number} --json labels`). If it's absent, say so and stop. Approving
   an untested branch collapses three independent inputs into two, and the missing one
   is the only evidence that the code does what the story asked.
5. **CI is green against the head SHA** (step 4).

Warnings, suggestions and questions don't gate approval. They still need an answer or
an action, so note their disposition in the summary rather than letting them lapse.

When all five hold, approve by applying the label:

```bash
gh pr edit {pr_number} --add-label "gate: reviewer-approved"
```

The label is what the tech lead reads, and it survives if this session dies before
your report is read.

### 11) Summary

- **`interactive`:** "Review complete for #{issue_number}. {n} blocker(s), {n}
  warning(s), {n} question(s), {n} suggestion(s). {summary_of_disposition}"
- **`subagent`:** write the report to `{journal_dir}/review-{cycle}.md` as you go,
  then reply with only the block below (per `.claude/shared/subagent-contract.md`):

  ```
  VERDICT: {APPROVED | FINDINGS (n) | NEEDS_RULING (n)}
  REPORT: {journal_dir}/review-{cycle}.md
  PR: {pr_number}
  ```

`FINDINGS (n)` is an ordinary outcome: the story goes back to the developer. Never
soften a real finding to report `APPROVED`. The verdict is read as a gate, and a false
one merges code nobody checked. Never paste the report, the diff or check output into
the reply.

Keep communication concise. Use no emojis except the severity indicators.
