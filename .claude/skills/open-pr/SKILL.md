---
name: open-pr
description: >
  Load this skill when the user says "open pr", "open-pr", or "/open-pr", or when the
  developer has pushed a verified branch. Opens the pull request for a verified,
  pushed branch, or on rework re-entry strips the worker gate labels from the
  existing pull request. Never commits, pushes or verifies.
license: MIT
metadata:
  audience: maintainers
  workflow: pull-request-creation
---

## Inputs

- `issue_number`: required.
- `mode`: `interactive` (default) or `subagent`.
- `branch`: required in `subagent` mode. The story's feature branch. In `interactive`
  mode, take the current branch.
- `verified_sha`: required. The last `PASS` cycle's `VERIFIED_SHA`, as pushed by
  `implement-plan` step 6.
- `base_branch`:
  - In `subagent` mode it is required, because the caller resolves it (see
    `.claude/shared/subagent-contract.md`). Never derive it yourself.
  - In `interactive` mode derive it the way `verify-implementation` does (its
    `base_branch` input), or ask.
- `journal_dir` and `attempt`: `subagent` mode only, for the report path.

In `subagent` mode, a missing required input is `BLOCKED (1)` naming it. Never ask a
question in `subagent` mode: a background worker has no turn for the answer to land
in.

## Procedure

### 1) Input gate

Check all of the following:

- `git branch --show-current` equals `branch`.
- `git status --porcelain` is empty.
- After `git fetch origin {branch}`, both `git rev-parse HEAD` and
  `git rev-parse origin/{branch}` equal `verified_sha`.

On any mismatch, stop. `interactive` — say which check failed and that
`implement-plan` step 5 must run again. `subagent` — `BLOCKED (1)`. This skill never
fixes a mismatch: it does not commit, push or run verify.

### 2) Find an existing pull request

```bash
gh pr list --head {branch} --state open --json number
```

### 3a) Rework re-entry (a pull request exists)

Strip the worker gates:

```bash
gh pr edit {pr_number} --remove-label "gate: qa-complete" --remove-label "gate: reviewer-approved"
```

They describe code that is no longer the head. Leaving one would let the story merge
on a sign-off given against different code. There is no owner label to preserve: the
owner's judgement was spent in the plan question rounds, before the code existed.

Read the labels back with `gh pr view {pr_number} --json labels` and confirm neither
remains. Do not create a pull request. The verdict is `FIXED`.

### 3b) First open (no pull request)

- `interactive` — ask "Are you ready to post a pull request?" and wait for yes.
- `subagent` — proceed. The pull request is the assigned outcome, not a commitment to
  merge. The two worker gate labels, the approved plans and the lead's judgement still
  stand before the merge. For a standalone issue, the owner merges into `master`.

Read `issue_title` and `milestone_title` with
`gh issue view {issue_number} --json title,milestone`. Write the body to a file
(in `journal_dir` in `subagent` mode, in the scratchpad in `interactive` mode) and
pass it with `--body-file`. Then run `gh pr create` per `docs/coding-standards.md` §3,
setting everything at creation (do not rely on later edits):

- `--base {base_branch}`
- `--title "{issue_title} (#{issue_number})"`
- `--milestone "{milestone_title}"` — omit entirely if none; never invent one
- `--body-file {path}` — brief overview, `Closes #{issue_number}`, and the milestone
  name as a readable line if assigned

Read `{pr_number}` from the `gh pr create` output. The verdict is `PR_OPEN`.

### 4) Confirm

`gh pr view {pr_number} --json headRefOid` must equal `verified_sha`.

## Reporting

**`subagent`:** append one progress line to `implement-{attempt}.md`, then per
`.claude/shared/subagent-contract.md` reply with only:

```
VERDICT: {PR_OPEN | FIXED | BLOCKED (n)}
REPORT: {journal_dir}/implement-{attempt}.md
PR: {pr_number}
SHA: {verified_sha}
```

**`interactive`:** report the pull request URL and whether it was created or
re-entered.

## Guardrails

- No force push, commit, push or history rewrite.
- Never merge.
- Never add a gate label.
