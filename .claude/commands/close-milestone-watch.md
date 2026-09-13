---
description: Wait for milestone PR to merge, then close milestone, prepare-base, and tag
subtask: true
---

## Inputs

- `$1` is the PR number of the milestone → `master` PR. Ask "What is the milestone PR
  number?" if it's missing.
- `$2` is the milestone number, e.g. `1` or `1.1`. Ask "What is the milestone number?"
  if it's missing.

Call them `PR_NUMBER` and `MILESTONE_NUMBER`. The branch and tag are both
`milestone/m$MILESTONE_NUMBER`.

## Watch loop

Run `gh pr view $PR_NUMBER --json state --jq '.state'` every 30 seconds (`sleep 30`):

- **`MERGED`:** post "PR #$PR_NUMBER merged. Proceeding with milestone close, branch
  deletion, and tagging. Interrupt now if this is unexpected." and go to **On merge**.
- **`CLOSED`:** post "PR #$PR_NUMBER was closed without merging. Aborting milestone
  close." and exit.
- **Still open after 20 checks (~10 minutes):** ask "PR #$PR_NUMBER has not merged
  after ~10 minutes. Continue waiting? (yes/no)". `yes`, `y` or `confirm` resets the
  count. Anything else posts "Stopping watch. Run
  `/close-milestone-watch $PR_NUMBER $MILESTONE_NUMBER` again to resume." and exits.

## On merge

### 1) Close the GitHub milestone

`MILESTONE_NUMBER` is a branch and tag suffix taken from the milestone's title. It is
**not** the GitHub API number, and the two diverge (`M4 — …` can be API number `7`).
Read the API number from the PR instead:

```
gh pr view $PR_NUMBER --json milestone --jq '.milestone.number'
gh api repos/{owner}/{repo}/milestones/{that number} -X PATCH -f state=closed
```

If the PR has no milestone, or the PATCH fails, post the error and stop. Never fall
back to `$MILESTONE_NUMBER`. Post "Milestone M$MILESTONE_NUMBER closed on GitHub."

### 2) Prepare master

Invoke `prepare-base` with `base_branch = master` and `mode = interactive`. Pass both
rather than asking for them. Use interactive mode on purpose: every story branch has
just finished, which makes this the one point where the stale-branch cleanup is worth
running, and subagent mode skips it.

### 3) Delete the milestone branch

```
git branch -d milestone/m$MILESTONE_NUMBER
git push origin --delete milestone/m$MILESTONE_NUMBER
```

The `guard-destructive` hook intercepts both commands. In your own session it asks
for confirmation, so confirm and continue. Under an agent it denies them. In that
case don't rephrase or route around them; post both commands for the user to run,
note the deletion as outstanding, and continue.

- If `-d` fails because the branch isn't fully merged, post the error and stop.
  **Never use `-D`**: a branch git doesn't consider merged is a reason to look, not
  to force.
- If the remote delete fails, note it and continue.

### 4) Tag

```
git tag milestone/m$MILESTONE_NUMBER origin/master
git push origin refs/tags/milestone/m$MILESTONE_NUMBER
```

Tag `origin/master` rather than `HEAD`, because `prepare-base` may have left you off
master if another worktree holds it. Push the fully qualified tag ref, because a
surviving branch with the same name makes the short form ambiguous.

Post: "Milestone M$MILESTONE_NUMBER complete. PR #$PR_NUMBER merged to master,
milestone closed on GitHub, milestone branch deleted {or: deletion outstanding —
see above}, tag milestone/m$MILESTONE_NUMBER created, master is current and ready for
the next milestone."
