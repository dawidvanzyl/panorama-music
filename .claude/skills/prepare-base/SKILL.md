---
name: prepare-base
description: >
  Load this skill when the user says "prepare base", "prepare-base", or
  "/prepare-base". Prunes remote tracking references, checks out a base branch,
  pulls latest, and cleans up local-only feature branches after confirmation.
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

* `base_branch`: prefer to infer from context if specified by the user.
* If not provided, ask:

  > "Which base branch would you like to prepare? (e.g. master)"

Do not proceed until `base_branch` is confirmed.

---

## Procedure

### 0) Gather inputs

* If `base_branch` is not provided, request it.
* Stop execution until confirmed.

---

### 1) Verify working tree (safety gate)

* Run:

  ```bash
  git status --porcelain
  ```
* If output is not empty:

  * Display the modified/untracked files.
  * Ask:

    > "You have uncommitted changes. Continue anyway? (yes/no)"
  * Accept only: `yes`, `y`, or `confirm`
  * If anything else → stop execution.
* Never stash, commit, or discard automatically.

---

### 2) Update remote references

* Run:

  ```bash
  git fetch --prune origin
  ```
* Notify user of result.

---

### 3) Checkout base branch

* Checkout `base_branch`
* Notify:

  > "Checked out branch: {base_branch}"

---

### 4) Pull latest

* Pull latest changes:

  ```bash
  git pull origin {base_branch}
  ```
* Report:

  * already up to date, or
  * number of commits updated (if available)

---

### 5) Identify safe deletion candidates

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

* Determine:

  * branches with no upstream
  * intersect with branches fully merged into `base_branch`

Command basis:

```bash
git branch --merged {base_branch}
git branch -vv
```

* Final candidate list = local-only ∩ merged ∩ not protected

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

Provide final structured summary:

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