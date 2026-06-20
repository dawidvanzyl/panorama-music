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

Track iteration count, starting at 0.

Repeat the following steps in a continuous loop until the PR is merged or closed:

### Step 1 — Check PR state

After 20 iterations (~10 minutes) without `MERGED` or `CLOSED`, post:
> "PR #$PR_NUMBER has not merged after ~10 minutes. Continue waiting? (yes/no)"

Accept only `yes | y | confirm` to continue (reset counter and keep looping).
Anything else: post "Stopping watch. Run `/close-milestone-watch $PR_NUMBER $MILESTONE_NUMBER` again to resume." and exit the command.

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

Increment iteration count.

Run:
```
sleep 30
```

Then go back to Step 1.

## On Merge

Post: "PR merged. Proceeding with milestone close, branch deletion, and tagging. Interrupt now if this is unexpected."

### 1) Close GitHub milestone

```
gh api repos/{owner}/{repo}/milestones/$MILESTONE_NUMBER -X PATCH -f state=closed
```

If the command fails (non-zero exit code), post the error output and stop execution. Do not proceed to prepare-base, branch deletion, or tagging.

Post: "Milestone M$MILESTONE_NUMBER closed on GitHub."

### 2) Load prepare-base with master

Invoke the `prepare-base` skill.

Provide the following input — do not ask for it:
- `base_branch` = `master`

### 3) Delete the milestone branch — local and remote
```
git branch -d milestone/m$MILESTONE_NUMBER
git push origin --delete milestone/m$MILESTONE_NUMBER
```

If `git branch -d` fails (branch not fully merged), do NOT retry with `-D`. Post the error and stop execution — do not proceed to tagging with a stale branch present.
If `git push origin --delete` fails (e.g. already deleted, permissions), note this in the final summary but continue to step 4.

Post: "Milestone branch milestone/m$MILESTONE_NUMBER deleted (local and remote)."

### 4) Create and push tag

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
> "Milestone M$MILESTONE_NUMBER complete. PR #$PR_NUMBER merged to master, milestone closed on GitHub, milestone branch deleted (local{, remote deletion failed — see above if applicable}), tag milestone/m$MILESTONE_NUMBER created, master is current and ready for the next milestone."	
