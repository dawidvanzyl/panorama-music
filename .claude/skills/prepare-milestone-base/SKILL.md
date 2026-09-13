---
name: prepare-milestone-base
description: >
  Load this skill when the user says "prepare milestone base",
  "prepare-milestone-base", or "/prepare-milestone-base". Checks out master,
  pulls latest, and creates and pushes a milestone/m{number} branch derived
  from an epic issue.
license: MIT
metadata:
  audience: maintainers
  workflow: git-branch-management
---

## Goal

Create `milestone/m{number}` from the latest `origin/master` and push it. This is the
integration branch for Mode A (milestone-driven development) in `coding-standards.md`.
`prepare-base` protects `milestone/*` branches from deletion.

This skill only creates and verifies a branch. Make no file edits, no commits and no
tags. Don't merge, rebase or rewrite history, except for the confirmed reset in step
3. Keep communication concise, with no emojis.

## Inputs

- `epic_issue_number`: ask "What is the epic issue number?" if it isn't given.

## Procedure

### 1) Derive the milestone number

Run `gh issue view {epic_issue_number} --json title,milestone`.

- If no milestone is assigned, stop and ask the user to assign one on GitHub.
- Take the number from the milestone's own title (`.milestone.title`), never from
  the epic's title, using `M(\d+(?:\.\d+)?)`. The branch name is lowercase:
  `M3` becomes `milestone/m3`, and `M1.1` becomes `milestone/m1.1`.
- If there's no match, or more than one, ask the user for the number and stop.

### 2) Clean tree

If `git status --porcelain` isn't empty, report "Working tree has uncommitted changes.
Please commit or stash before continuing." and stop.

### 3) Create or reuse the branch

Run `git fetch origin`. Then check whether the branch exists remotely
(`git ls-remote --heads origin milestone/m{number}`) and locally
(`git branch --list milestone/m{number}`).

**The branch doesn't exist:**

```bash
git checkout -B milestone/m{number} origin/master
git push -u origin refs/heads/milestone/m{number}:refs/heads/milestone/m{number}
```

Push with the fully qualified refspec. `close-milestone-watch` leaves behind a tag
with the same name, which makes a short-name push fail with "matches more than one".

**The branch exists:** ask the user "Branch milestone/m{number} already exists. Check
it out and hard-reset it to {origin/milestone/m{number} | origin/master if it exists
locally only}?". Use the reset target that applies, and accept only `yes`, `y` or
`confirm`; anything else stops. On confirmation:

1. Run `git switch milestone/m{number}`. Use `switch`, not `checkout`: `switch`
   refuses to detach onto a same-named tag, while `checkout` would do it silently.
2. Run `git reset --hard origin/milestone/m{number}`. If the branch is local-only,
   say so and run `git reset --hard origin/master` instead.

### 4) Verify

Confirm that `git branch --show-current` is `milestone/m{number}` and that
`git ls-remote --heads origin milestone/m{number}` returns it. If either check fails,
report which one and stop. Otherwise report: "Milestone branch **milestone/m{number}**
is active locally and present on origin. Ready for sub-issue implementation."
