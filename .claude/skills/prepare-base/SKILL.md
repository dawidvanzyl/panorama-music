---
name: prepare-base
description: >
  Load this skill when the user says "prepare base", "prepare-base", or
  "/prepare-base". Prunes remote tracking references, checks out a base branch,
  pulls latest, and — interactively only — cleans up local-only feature branches
  after confirmation.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: git-branch-management
---

---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **prepare-base**. Preparing base branch..."

---

## Inputs

* `mode`: `interactive` (default) or `subagent`.
* `base_branch`:
  * `interactive` — prefer to infer from context if specified by the user;
    otherwise ask:

    > "Which base branch would you like to prepare? (e.g. master)"

    Do not proceed until confirmed.
  * `subagent` — **required**. The caller resolves it, per
    `.claude/shared/subagent-contract.md`. Do not ask, and do not derive it here:
    the derivation rule lives in one place so it cannot drift, and a worker that
    guesses its base produces a diff against the wrong branch.

## What `subagent` mode does not do

Steps 5–8 — identifying and deleting stale local branches — **do not run in
`subagent` mode**. They are skipped entirely, not deferred or reported.

Branch deletion is destructive, requires explicit confirmation by project policy,
and is refused for agents by the `guard-destructive` hook regardless of what this
skill says. It is also housekeeping rather than preparation: nothing about checking
out a base branch requires deleting anything. Listing candidates an agent cannot act
on would only add noise the caller has to ignore.

Run `/prepare-base` yourself between runs to clean up.

---

## Procedure

### 0) Gather inputs

* `interactive` — if `base_branch` is not provided, request it and stop until
  confirmed.
* `subagent` — if `base_branch` was not passed, do not proceed. Report
  `BLOCKED (1)` naming the missing input.

---

### 1) Verify working tree (safety gate)

* Run:

  ```bash
  git status --porcelain
  ```
* If output is not empty:

  * `interactive`:
    * Display the modified/untracked files.
    * Ask:

      > "You have uncommitted changes. Continue anyway? (yes/no)"
    * Accept only: `yes`, `y`, or `confirm`
    * If anything else → stop execution.

  * `subagent`: **stop and escalate.** Report `BLOCKED (1)` with the file list.

    Do not continue, and do not resolve it. A dirty tree at the start of a story
    has two plausible causes and you cannot tell them apart: work the developer
    left behind, or **your own interrupted work from a run that died mid-story**.
    Quota exhaustion makes the second case ordinary rather than rare.

    Checking out a base branch over either one risks carrying foreign changes into
    a story, or destroying work that was about to be committed. Only the tech lead
    has the run journal needed to tell which it is.

* Never stash, commit, or discard automatically — in either mode.

---

### 2) Update remote references

* Run:

  ```bash
  git fetch --prune origin
  ```
* Notify user of result.

---

### 3) Checkout base branch (worktree-aware)

* Attempt:

  ```bash
  git checkout {base_branch}
  ```
* If it succeeds:

  * Notify: "Checked out branch: {base_branch}"
  * Proceed to step 4.
* If it fails because the branch is already checked out in another worktree
  (git reports something like `'{base_branch}' is already used by worktree
  at '<path>'`):

  * Do not retry, force, or attempt to detach/move the other worktree.
  * Stay on the current branch.
  * Notify: "{base_branch} is already checked out in another worktree
    (`<path>`); skipping local checkout. origin/{base_branch} (fetched in
    step 2) is the branch reference point for downstream steps."
  * Skip step 4 — the remote ref is already current from the fetch in step 2.
  * Proceed to step 5.
* Any other checkout failure → stop and report it to the user.

---

### 4) Pull latest

* Only runs if step 3 checked out `base_branch` locally.
* Pull latest changes:

  ```bash
  git pull origin {base_branch}
  ```
* Report:

  * already up to date, or
  * number of commits updated (if available)

---

### 5) Identify safe deletion candidates

> **`interactive` mode only.** In `subagent` mode, skip to step 9 — steps 5 through
> 8 do not run. See *What `subagent` mode does not do*.

Define:

* **Local-only branch**: branch with no upstream tracking reference
* **Merged branch**: fully merged into `base_branch`

Steps:

* List all local branches

* Exclude protected branches:

  * `{base_branch}`
  * `master`
  * `main`
  * `develop`
  * `release/*`
  * `milestone/*`

* Exclude branches checked out in any other worktree:

  ```bash
  git worktree list --porcelain
  ```

  Parse each `worktree`/`branch` pair. Any branch attached to a worktree
  path other than the current one is never a deletion candidate — it belongs
  to another worktree's in-progress work, regardless of merge or upstream
  status.

* Determine:

  * branches with no upstream
  * intersect with branches fully merged into `base_branch`

Command basis:

```bash
git branch --merged {base_branch}
git branch -vv
```

* Final candidate list = local-only ∩ merged ∩ not protected ∩ not checked
  out in another worktree

>Note: --merged detects branches whose commits are direct ancestors of base_branch. Branches integrated via squash-merge (per project standards, all feature/bug branches are squash-merged) will typically NOT appear as merged, even though their work has landed. This step will under-report candidates for squash-merged branches — this is expected and safe, since step 8 uses -d, which would refuse to delete them anyway.

---

### 6) Handle no-op case

* If no candidates:

  > "No safe local-only feature branches found to delete."

  * Stop execution

---

### 7) Confirmation gate

* Display candidate branches
* Ask:

  > "The following branches will be deleted: {list}. Confirm? (yes/no)"

Accept only:

* `yes`
* `y`
* `confirm`

Anything else:

* Treat as rejection
* Output:

  > "Branch deletion cancelled."
* Stop execution

---

### 8) Delete branches
For each confirmed branch:
```bash
git branch -d <branch>
```
* If deletion succeeds:
  * Notify: "Deleted branch: {branch}"
* If deletion fails (branch not detected as merged — e.g. squash-merged):
  * Notify: "{branch} could not be deleted with -d (not detected as merged — possibly squash-merged). Skipping."
  * Do NOT retry with -D
  * Continue to next candidate

(Do NOT use -D)

---

### 9) Summary

`subagent` mode — emit only the verdict block. Ask nothing, summarise nothing, and
write no journal file: this is a step inside the caller's work, not a delegated task
of its own, so it has no report to point at.

```
VERDICT: {PREPARED | BLOCKED (n)}
BASE: {base_branch}
CHECKED_OUT: {yes | no — already held by another worktree}
```

`PREPARED` means `origin/{base_branch}` is fetched and current. `CHECKED_OUT: no` is
a normal outcome, not a failure — the caller branches from `origin/{base_branch}`
either way.

`interactive` mode — provide the final structured summary:

## Summary

* Current branch: {base_branch}
* Remote references pruned: yes
* Latest changes pulled: yes
* Branches deleted:

  * branch-a
  * branch-b
* Branches skipped (not safely deletable):
  * branch-c

If none deleted:

* explicitly state: "No branches were deleted"

If none skipped:

* explicitly state: "No branches were skipped"

---

## Guardrails

* Never delete `master`, `main`, or `base_branch`
* Never delete protected branches, including:

  * `release/*`
  * `milestone/*`
* Never delete without explicit confirmation
* Never push deletions to remote unless explicitly requested
* Never modify working tree automatically
* Never delete any branch in `subagent` mode — not even a confirmed candidate, and
  not by asking the caller for permission. The hook refuses it regardless; treating
  the refusal as an obstacle to route around is itself the error.
* Never ask a question in `subagent` mode. A background worker has no interactive
  turn for an answer to arrive in, so a question is not a pause — it is a hang.
  Report `BLOCKED (n)` and let the caller decide.