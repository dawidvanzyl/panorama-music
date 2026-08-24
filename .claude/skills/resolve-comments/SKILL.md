---
name: resolve-comments
description: >
  Load this skill when the user says "resolve comments", "resolve-comments", or
  "/resolve-comments". Checks open PR review comments, addresses valid ones in a
  single batched commit, and resolves all threads with appropriate replies.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-pr-review
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **resolve-comments**. Starting PR comment resolution..."

## Inputs

- `pr_number`: prefer to infer from the PR created earlier in the current
  session; required in `subagent` mode.
- `issue_number`: prefer to infer from the issue implemented earlier in the
  current session; required in `subagent` mode.
- `journal_dir`: required in `subagent` mode. Absolute path to this story's journal
  directory.
- `mode`: `interactive` (default) or `subagent`.

If neither number is available in `interactive` mode, ask: "What is the PR number,
and what is the issue number?"

## Procedure

### 0) Gather inputs

`interactive`:

- Check if a PR and issue were referenced earlier in this session and retrieve
  their numbers automatically.
- If `pr_number` is missing, ask: "What is the PR number to resolve comments
  for?"
- If `issue_number` is missing, ask: "What is the issue number?"
- Do not proceed until both are confirmed.

`subagent`:

- Every required input arrives in the brief. If one is missing, report
  `BLOCKED (1)` naming it. Never ask — a background worker has no interactive turn
  for an answer to land in, so a question is a hang rather than a pause.
- Prefer resuming your own earlier context for this story over re-deriving it. You
  implemented this branch; you already know why the code is shaped the way it is.

### 1) Read the issue

Fetch issue `#{issue_number}` and extract the following sections. These are
the reference for judging whether review feedback is valid.

- **`## Functional Requirements`** — what the story was required to deliver.
- **`## API / Interface Contract`** — the agreed contract. Comments asking to
  deviate from this are invalid unless the contract itself was wrong.
- **`## Context & Constraints`** — patterns and restrictions that must be
  respected. Comments contradicting a stated constraint are invalid.
- **`## Notes`** — deliberate deferrals and known edge cases. Comments raising
  something explicitly deferred in Notes are invalid for this issue.

### 2) Fetch all unresolved comments

- Fetch all open/unresolved review comments and threads on PR `#{pr_number}`.
- If there are no unresolved comments, notify the user: "No unresolved comments
  found on PR #{pr_number}." and stop.

### 3) Classify all comments

Review **all** unresolved comments before making any changes. Classify each as:

- **Valid** — the feedback is correct and warrants a code or documentation
  change. It identifies a genuine gap against the requirements, a standards
  violation, or a correctness issue.
- **Invalid** — the feedback is incorrect, contradicts a stated constraint,
  raises something explicitly deferred in `## Notes`, or is already addressed.
- **Question** — validity cannot be determined from the issue content alone. Do not
  guess.
- **Escalate** — the feedback is valid, but acting on it is **outside your role**.

**The Escalate case, specifically:** a comment asking you to change an E2E spec. You
cannot write in `e2e/` — the path guard refuses it — and that is deliberate. Those
specs were designed before the code existed and QA signed them off; editing one to
accept what was built erases the only external check that the story was delivered.

The reviewer is instructed not to raise these, but if one arrives anyway, do not
resolve the thread and do not attempt a workaround. Escalate to the tech lead with
the thread and your reading of it. A spec that genuinely contradicts the sub-issue is
a real possibility — it is simply not yours to settle.

Then:

- `interactive` — present the classification and wait:

  > "Classification complete. {n} valid, {n} invalid, {n} questions, {n} escalate.
  > Proceed?"

- `subagent` — proceed with the Valid set without asking. Escalate the Question and
  Escalate sets to the tech lead as one message rather than several, and carry on
  with everything that does not depend on the answers. Blocking the whole batch on
  one ambiguous comment wastes a round trip on work you could already have done.

### 4) Address valid feedback (batched)

- Implement fixes for **all valid** comments together. Fix the **code** — never a
  spec, and never a test weakened to accommodate the change.
- Run the checks defined in `.claude/shared/automated-checks.md` for the affected
  scopes. Read them from that file rather than from memory: it is the single
  definition, and a copy here would drift from it.
- If any check fails, fix the failure before proceeding. Do not commit or
  push with failing checks.
- Create **at most one commit** for all valid fixes (unless the user explicitly
  requests otherwise).

**Before pushing, strip the worker gate labels:**

```bash
gh pr edit {pr_number} --remove-label "gate: qa-complete" --remove-label "gate: reviewer-approved"
```

Both describe a branch that stops existing the moment you push. Leaving one in place
would let the story merge on a sign-off given against different code — the one path
by which this pipeline could ship something nobody checked. Removing them is not an
admission of failure; it is what makes rework safe, and QA and the reviewer will
re-apply them once they have looked again.

Leave `gate: owner-approved` alone. That one is the owner's to manage.

- Push once.

### 5) Reply and resolve all threads

- For each **valid** thread:
  - Reply describing exactly what was changed to address the feedback.
  - Resolve the thread.
- For each **invalid** thread:
  - Reply respectfully with clear rationale explaining why no change was made,
    citing the relevant issue section where applicable (e.g. "This was
    deliberately deferred in the issue Notes").
  - Resolve the thread.
- For each **Question** or **Escalate** thread:
  - **Do not resolve it.** Leave it open until the ruling arrives, then reply with
    the decision and resolve.
  - An unresolved thread is what stops the reviewer approving prematurely; resolving
    one you have not actually settled removes that signal.
- If thread resolution fails (e.g. permissions or API error), note this in
  the final summary rather than failing silently — replies should still be
  posted even if resolution doesn't succeed.

### 6) Summary

Post a brief summary comment on the PR listing:
- how many comments were addressed,
- how many were dismissed as invalid (with a one-line reason for each),
- any thread left open pending a ruling.

`subagent` — also write your report to `{journal_dir}/resolve-{cycle}.md` **as you
go**, recording each comment's classification and the reasoning behind it. A later
cycle reads that file rather than re-litigating a comment already judged.

Then reply with the verdict block only, per `.claude/shared/subagent-contract.md`:

```
VERDICT: {FIXED | NEEDS_RULING (n)}
REPORT: {journal_dir}/resolve-{cycle}.md
PR: {pr_number}
SHA: {sha}
```

`FIXED` means every thread is answered and resolved, and the branch is pushed.
If any thread is still open pending a ruling, the verdict is `NEEDS_RULING`, even
when the valid fixes all landed.

Never paste diffs, comment bodies, or check output into the reply.

## Guardrails

- Do not use force push or destructive git history commands unless explicitly
  requested.
- Do not amend commits unless explicitly requested.
- Do not classify a comment as invalid solely because fixing it would be
  inconvenient. Invalid means factually wrong, out of scope, or explicitly
  deferred — not merely unwelcome. Under a time or turn limit this is the rule
  most likely to bend, and it is the one that matters most: an invalid marking is
  a claim the reviewer will re-examine, so a dishonest one costs a whole extra
  cycle rather than saving one.
- Never edit anything under `e2e/`, and never weaken or delete a test to satisfy a
  comment. If a comment requires it, that is an Escalate, not a fix.
- Never strip `gate: owner-approved`.
- Never resolve a thread you have not actually settled.
- Never ask a question in `subagent` mode — escalate to the tech lead instead, and
  continue with everything that does not depend on the answer.
- Keep replies concise and professional.