---
name: prepare-base
description: >
  Load this skill when the user says "prepare base", "prepare-base", or
  "/prepare-base". Prunes remote tracking references, checks out a base branch,
  pulls latest, and — interactively only — cleans up local-only feature branches
  after confirmation.
license: MIT
metadata:
  audience: maintainers
  workflow: git-branch-management
---

## Inputs

- `mode`: `interactive` (default) or `subagent`.
- `base_branch`:
  - In `interactive` mode, take it from context. Otherwise ask "Which base branch
    would you like to prepare? (e.g. master)" and wait for an answer.
  - In `subagent` mode it is required, because the caller resolves it (see
    `.claude/shared/subagent-contract.md`). Never derive it yourself: the rule lives in
    one place so it can't drift, and a guessed base produces a diff against the wrong
    branch. If it's missing, report `BLOCKED (1)` and name it.

In `subagent` mode, never ask a question. A background worker has no turn for the
answer to land in, so a question is a hang. Report `BLOCKED (n)` and let the caller
decide.

## Procedure

### 1) Working tree gate

Run `git status --porcelain`. If the output isn't empty:

- **`interactive`:** show the files and ask "You have uncommitted changes. Continue
  anyway? (yes/no)". Only `yes`, `y` or `confirm` lets you continue.
- **`subagent`:** report `BLOCKED (1)` with the file list, and don't resolve it. A
  dirty tree may be the developer's leftovers or your own work from a run that died
  mid-story, which quota exhaustion makes ordinary. Checking out over either can
  carry foreign changes into a story or destroy work that was about to be committed.
  Only the tech lead has the journal needed to tell which it is.

In both modes, never stash, commit, discard or otherwise modify the working tree.

### 2) Fetch

Run `git fetch --prune origin` and report the result.

### 3) Check out and pull

Run `git checkout {base_branch}`.

- **Succeeds:** run `git pull origin {base_branch}`, then report whether it was
  already up to date or how many commits it pulled.
- **Fails because the branch is already used by another worktree:** stay on the
  current branch. Don't retry, force, or move the other worktree. Report:
  "{base_branch} is already checked out in another worktree (`<path>`); skipping local
  checkout. origin/{base_branch} (fetched in step 2) is the branch reference point for
  downstream steps."
- **Any other failure:** stop and report it.

### 4) Clean up stale branches (`interactive` only)

In `subagent` mode, skip this step entirely: don't list candidates, and don't ask the
caller for permission. Branch deletion is destructive, needs explicit confirmation,
and the `guard-destructive` hook refuses it for agents anyway. Treating that refusal as
an obstacle to route around is itself the error. It's also housekeeping, not
preparation, so run `/prepare-base` yourself between runs to clean up.

**Candidates.** A branch is a candidate only if it is all of the following:

- **Local-only:** it has no upstream in `git branch -vv`.
- **Merged:** it appears in `git branch --merged {base_branch}`.
- **Not protected:** it isn't `{base_branch}`, `master`, `main`, `develop`,
  `release/*` or `milestone/*`.
- **Not checked out elsewhere:** it isn't attached to another worktree in
  `git worktree list --porcelain`. That branch is another worktree's in-progress
  work.

Squash-merged branches, which is every feature and bug branch here, usually don't
show as `--merged`, so this list under-reports. That's expected and safe.

**Delete.** If there are no candidates, say "No safe local-only feature branches found
to delete." and skip to the summary. Otherwise ask "The following branches will be
deleted: {list}. Confirm? (yes/no)". Anything other than `yes`, `y` or `confirm` means
"Branch deletion cancelled.", and you stop there.

For each branch, run `git branch -d <branch>`. If it fails, report "{branch} could not
be deleted with -d (not detected as merged — possibly squash-merged). Skipping." and
continue. **Never use `-D`**, and never push deletions to the remote unless the user
explicitly asks.

### 5) Summary

**`subagent`:** reply with only the block below. Write no journal file, because this
runs inside the caller's task:

```
VERDICT: {PREPARED | BLOCKED (n)}
BASE: {base_branch}
CHECKED_OUT: {yes | no — already held by another worktree}
```

`PREPARED` means `origin/{base_branch}` is fetched and current. `CHECKED_OUT: no` is
normal, because callers branch from `origin/{base_branch}` either way.

**`interactive`:** report:

- the current branch
- that remote refs were pruned
- whether the latest changes were pulled
- the branches deleted, or "No branches were deleted"
- the branches skipped, or "No branches were skipped"
