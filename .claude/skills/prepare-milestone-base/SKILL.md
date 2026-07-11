---
name: prepare-milestone-base
description: >
  Load this skill when the user says "prepare milestone base",
  "prepare-milestone-base", or "/prepare-milestone-base". Checks out master,
  pulls latest, and creates and pushes a milestone/m{number} branch derived
  from an epic issue.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: git-branch-management
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **prepare-milestone-base**. Creating milestone branch..."

---

## Inputs

- `epic_issue_number`: GitHub issue number of the milestone epic (e.g. `3`).

---

## Goal

Create a `milestone/m{number}` branch from the latest `origin/master` and push
it to remote, ensuring a clean, deterministic starting point for milestone work.
This branch serves as the integration branch for Mode A (milestone-driven
development) as defined in `coding-standards.md`.

---

## Guardrails

- **No file edits, no commits.**
- **No tagging of any kind (lightweight or annotated).**
- **No merge, rebase, or history rewriting operations.**
- This skill is strictly for branch creation and verification only.
- **Refuse to proceed if the working tree is dirty** (`git status --porcelain` not empty).
- If milestone branch exists remotely, require explicit user confirmation before proceeding.
- Keep all communication concise and professional. No emojis.
- `milestone/*` branches created by this skill are protected from deletion by `prepare-base.md`.

---

## Procedure

### 0) Gather inputs

- If `epic_issue_number` is missing, ask:
  > "What is the epic issue number?"
- Pause execution until provided.

---

### 1) Fetch epic issue and derive milestone number

- Fetch issue using GitHub CLI:
  ```bash
  gh issue view {epic_issue_number} --json title
````

* Extract milestone number using regex:

  * Primary match: `M(\d+(?:\.\d+)?)`
  * Normalize the extracted number to lowercase form for all branch names
  (e.g. `M3` → use `3`, branch is `milestone/m3`; `M1.1` → use `1.1`, branch
  is `milestone/m1.1`).
  
* If multiple matches exist or no match is found:

  * Ask user to provide milestone number manually
  * Stop execution

---

### 2) Check working tree cleanliness

* Run:

  ```bash
  git status --porcelain
  ```
* If output is not empty:

  * Inform user:

    > "Working tree has uncommitted changes. Please commit or stash before continuing."
  * Stop execution

---

### 3) Determine branch existence

* Check remote:

  ```bash
  git ls-remote --heads origin milestone/m{number}
  ```
* Check local:

  ```bash
  git branch --list milestone/m{number}
  ```

### Branch decision logic

#### If branch exists (remote or local)

* Ask user:

  > "Branch milestone/m{number} already exists. Do you want to check it out and update it from origin/master?"
* Accept: `yes | y | confirm`
* Anything else: stop execution

If confirmed:

* `git fetch origin`
* `git switch milestone/m{number}` (not `git checkout` — `switch` refuses to
  silently detach onto a same-named tag left behind by a prior
  `close-milestone-watch` run; `checkout` would not)
* If `origin/milestone/m{number}` exists:
  * `git reset --hard origin/milestone/m{number}`
* If branch exists locally only (no remote counterpart):
  * Inform user: "Branch exists locally only; resetting to origin/master instead."
  * `git reset --hard origin/master`
* Continue to Step 5

---

#### If branch does NOT exist

Proceed to Step 4.

---

### 4) Create milestone branch

Always base from remote master (not local):

```bash
git fetch origin
git checkout -B milestone/m{number} origin/master
git push -u origin refs/heads/milestone/m{number}:refs/heads/milestone/m{number}
```

Use the fully-qualified refspec for the push, not the short name. A prior
closed milestone leaves behind a tag named `milestone/m{number}` (created by
`close-milestone-watch`), and a short-name push fails with "src refspec ...
matches more than one" once a same-named tag exists.

---

### 5) Verify state

* Confirm active branch:

  ```bash
  git branch --show-current
  ```
* Confirm remote existence:

  ```bash
  git ls-remote --heads origin milestone/m{number}
  ```

If either check fails:

* Inform user of failure
* Stop execution

---

### 6) Final confirmation

> "Branch milestone/m{number} is active locally and present on origin. Ready for milestone feature branches."

---

## Summary

Post:

> "Milestone branch **milestone/m{number}** created from **origin/master** and pushed to origin. Ready for sub-issue implementation."