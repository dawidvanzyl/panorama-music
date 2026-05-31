---
description: Wait for milestone PR to merge, then close milestone, prepare-base, and tag
subtask: true
---

## Setup

This command takes two arguments:
- `$1` — PR number of the milestone branch → `master` PR
- `$2` — Milestone number (e.g. `1` for milestone `M1`)

If `$1` is missing, ask: "What is the milestone PR number?"
If `$2` is missing, ask: "What is the milestone number?"

Do not proceed until both values are confirmed. Store them as `PR_NUMBER` and `MILESTONE_NUMBER` for use throughout.

## Watch Loop

Repeat the following steps in a continuous loop until the PR is merged or closed:

### Step 1 — Check PR state

Run:
```
gh pr view $PR_NUMBER --json state --jq '.state'
```

If the output is `MERGED`:
- Post a message: "PR #$PR_NUMBER merged. Closing milestone, running prepare-base, and tagging..."
- Proceed to **On Merge**.

If the output is `CLOSED`:
- Post a message: "PR #$PR_NUMBER was closed without merging. Aborting milestone close."
- Exit the command.

### Step 2 — Sleep

Run:
```
sleep 30
```

Then go back to Step 1.

## On Merge

### 1) Close GitHub milestone

```
gh api repos/{owner}/{repo}/milestones/$MILESTONE_NUMBER -X PATCH -f state=closed
```

Post: "Milestone M$MILESTONE_NUMBER closed on GitHub."

### 2) Load prepare-base with master

Load and execute the full procedure defined in the skill file at:
`.opencode/skills/prepare-base/SKILL.md`

Provide the following input — do not ask for it:
- `base_branch` = `master`

### 3) Create and push tag

Get the current commit SHA:
```
git rev-parse HEAD
```

Create and push the tag:
```
git tag milestone/m$MILESTONE_NUMBER
git push origin milestone/m$MILESTONE_NUMBER
```

Post: "Tag milestone/m$MILESTONE_NUMBER created and pushed."

Post a final summary:
> "Milestone M$MILESTONE_NUMBER complete. PR #$PR_NUMBER merged to master, milestone closed on GitHub, tag milestone/m$MILESTONE_NUMBER created, master is current and ready for the next milestone."
