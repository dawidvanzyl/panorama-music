---
name: close-milestone
description: >
  Load this skill when the user says "close milestone", "close-milestone", or
  "/close-milestone". Creates the milestone-to-master PR, launches the
  close-milestone-watch command, and orchestrates the end of a milestone cycle.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Role

Close out a completed milestone: verify it, open the PR into `master`, drive CodeQL
to clean, then hand off to `close-milestone-watch`.

This PR gets **no second review pass**. Every story in it was already reviewed and
tested, and re-reviewing the accumulated diff would reopen settled decisions. The one
thing this stage surfaces is CodeQL, which runs here and nowhere earlier.

You make no file edits and no commits. CodeQL fixes go to a `developer` subagent,
under the same delegation rule that holds for the whole run. Keep communication
concise, with no emojis.

## Inputs

- `epic_issue_number`: ask for it if it isn't given.

## Procedure

### 1) Read context

- Run `gh issue view {epic_issue_number} --json title,body,milestone`.
- Take `milestone_title` from `.milestone.title`. If no milestone is assigned, stop
  and ask the user to assign one. Never parse the epic's own title.
- Take `milestone_number` from `milestone_title` using `M(\d+(?:\.\d+)?)`, so
  `M4 — …` gives `4` and `M4.1 — …` gives `4.1`. If there's no match, or more than
  one, ask for it.
- `milestone_branch` is `milestone/m{milestone_number}`.
- Collect every IT code line from the epic's `<!-- AC_START -->` block.
- Get `OWNER` and `REPO` from `git remote get-url origin`.

### 2) Validate prerequisites

Stop and report if any of these fails:
- `git branch --show-current` returns `milestone_branch`.
- `git status --porcelain` is empty.
- Every sub-issue is `CLOSED`. List any that aren't. Query:
  ```
  gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") {
    issue(number: EPIC_NUM) { subIssues(first: 50) {
      nodes { number title state labels(first: 10) { nodes { name } } }
    } } } }'
  ```

### 3) Verify IT codes

IT codes are proven by Playwright alone. Check each code.

1. **Does the spec exist?** Run `grep -rn "@{IT_CODE}" e2e/features --include="*.spec.ts"`.
   A green pipeline can't tell you this, because a code with no spec runs nothing and
   breaks nothing. No match means ❌ FAIL.
2. **Does it pass?** If a PR exists and `e2e-ci` passed on its head SHA (confirm the
   SHA; a tick on a superseded commit proves nothing), every code whose spec exists
   passes. Otherwise verify locally:
   - Bring the stack up if needed:
     `curl --silent --fail http://localhost:3000/api/health || RESET_DB=true docker compose --profile qa up --build -d`
   - From `e2e/`, run `npx playwright test --grep "@{IT_CODE}"` for each code.

Also run `grep -rE '\[Trait\("AC", "[0-9]+IT[0-9]+"\)\]' src/ --include="*.cs"`. Any
hit is a ❌ Blocker and never counts as coverage: a unit test carrying an IT trait
makes a code look proven while asserting far less.

Then re-fetch the epic body and tick `- [x]` for each passing code inside the
`AC_START` block. Write the body only if something changed. Stop with "Milestone
M{milestone_number} acceptance criteria partially passing: {n}/{m}. Failing codes:
{list}." unless every code passes and there are no blockers.

### 4) Push and create PR

Run `git fetch origin master`. If `git rev-list --count HEAD..origin/master` is
greater than 0, ask the user: "milestone/m{milestone_number} is {n} commit(s) behind
origin/master. Merge or rebase master into this branch before creating the PR, or
confirm you want to proceed anyway (conflicts, if any, will surface on GitHub)."
Only `yes`, `y` or `confirm` lets you continue.

Push with the fully qualified refspec. A closed milestone leaves a tag with the same
name, which makes the short form ambiguous:

```
git push origin refs/heads/milestone/m{milestone_number}:refs/heads/milestone/m{milestone_number}
gh pr create --base master --head milestone/m{milestone_number} \
  --title "Milestone M{milestone_number} — {milestone_title}" \
  --milestone "{milestone_title}" \
  --body "## Summary\n\nMilestone M{milestone_number} — {milestone_title}.\n\nCloses #{epic_issue_number}."
```

Capture the PR number from the output.

### 5) CodeQL remediation loop

CodeQL findings are expected here, because this is the first place it runs. Loop:

1. Wait with `gh pr checks {pr_number} --watch`.
2. Read the findings: `gh pr view {pr_number} --json comments,reviews` and
   `gh api repos/{OWNER}/{REPO}/pulls/{pr_number}/comments --jq '.[] | {path, line, body}'`.
3. **No findings and CI green:** go to step 6.
4. **Findings:** spawn a background `developer`. The brief is the finding verbatim
   (the rule, the file and the line), plus `base_branch: milestone/m{n}` and a
   `journal_dir`. Fixes commit directly to the milestone branch, with no feature
   branch and no sub-issue, because there's no story to attach them to. The developer
   has no story context, since the code may come from a story closed weeks ago. It
   must therefore read the surrounding code before changing it. A fix that satisfies
   the scanner but quietly changes behaviour won't be caught by any later review.
5. The fix's push re-runs CodeQL and CI. Go back to 1.

**CI is the regression gate, so never proceed while it's red.** You run nothing
yourself: `ci.yml` covers the backend, frontend and full Playwright suite on every
push. A green scan on a red build is not progress, and this code already passed QA
and review, so CI is the only thing still watching it.

**Never dismiss or suppress a finding**, yourself or by telling a developer to, and
that includes inline suppression annotations. Whether something is a false positive
is a security decision that belongs to the developer. Escalate it, and record the
ruling in the run journal so the next milestone doesn't reopen it.

### 6) Hand off

Run `/close-milestone-watch` with `$1` set to the PR number and `$2` set to the
milestone number. It merges, closes the milestone, deletes the branch, runs
`prepare-base` and tags. Relay its final summary as this workflow's conclusion, and
don't add your own.
