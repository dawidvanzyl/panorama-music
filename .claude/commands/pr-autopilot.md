---
description: Auto-resolve PR comments and close issue when merged
subtask: true
---

## Setup

This command takes two arguments:
- `$1` — PR number to watch
- `$2` — Story issue number linked to the PR

If `$1` is missing, ask: "What is the PR number to watch?"
If `$2` is missing, ask: "What is the story issue number linked to this PR?"

Do not proceed until both values are confirmed. Store them as `PR_NUMBER` and `ISSUE_NUMBER` for use throughout.

## Watch Loop

Repeat the following steps in a continuous loop until the PR is merged or closed:

### Step 1 — Check PR state

Run:
```
gh pr view $PR_NUMBER --json state --jq '.state'
```

If the output is `MERGED` or `CLOSED`:
- Post a message: "PR #$PR_NUMBER is $STATE. Stopping watch loop and closing issue..."
- Exit the loop and proceed to **Finalise**.

### Step 2 — Check for unresolved review comments

Infer the repo owner and name:
```
gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"'
```

Then fetch unresolved review comments:
```
gh api repos/{owner}/{repo}/pulls/$PR_NUMBER/comments
```

### Step 3 — Branch on comment presence

**If unresolved comments are found:**

Load and execute the full procedure defined in the skill file at:
`.opencode/skills/resolve-comments/SKILL.md`

Use `$PR_NUMBER` as the `pr_number` input — do not ask for it again.

After the skill procedure completes (all threads resolved), proceed to Step 4.

**If no unresolved comments are found:**

Post a brief log message: "No unresolved comments on PR #$PR_NUMBER. Checking again in 30s..."

### Step 4 — Sleep

Run:
```
sleep 30
```

Then go back to Step 1.

## Finalise

Load and execute the full procedure defined in the skill file at:
`.opencode/skills/close-issue/SKILL.md`

Provide the following inputs — do not ask for them again:
- `issue_number` = `$ISSUE_NUMBER`
- `parent_issue_number` — infer from the body of issue `$ISSUE_NUMBER` by looking for a linked epic reference; if it cannot be inferred, ask the user: "What is the parent epic issue number?"
