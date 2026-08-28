---
name: close-milestone
description: >
  Load this skill when the user says "close milestone", "close-milestone", or
  "/close-milestone". Creates the milestone-to-master PR, launches the
  close-milestone-watch command, and orchestrates the end of a milestone cycle.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **close-milestone**. Starting milestone close workflow..."

## Inputs

- `epic_issue_number`: the GitHub issue number of the milestone epic (e.g. `3`).

## Goal

Close out a completed milestone by:
1) verifying all sub-issues are closed,
2) verifying every milestone IT acceptance criterion passes,
3) creating a PR from `milestone/m{number}` to `master`,
4) driving the CodeQL remediation loop until the scan is clean and CI is green,
5) launching the `close-milestone-watch` command that waits for the merge,
6) which then closes the GitHub milestone, deletes the milestone branch, runs
   prepare-base on master, and tags.

This pull request gets **no second review pass**. Every story in it was reviewed
and tested individually; re-reviewing the accumulated diff would re-litigate
decisions that are already settled. The one thing this stage exists to surface is
CodeQL, which runs here and nowhere earlier.

## Guardrails

- **Refuse if any sub-issues under the epic are still open.**
- **Refuse if the current branch is not `milestone/m{number}`.**
- **Refuse if the working tree is dirty.**
- **No file edits, no commits beyond git commands.** CodeQL fixes are delegated to a
  `developer` subagent, never made here — the same delegation rule that holds for
  the whole run.
- **Never proceed to the merge while CI is red or CodeQL has open findings.**
- **Never dismiss or suppress a CodeQL finding.** Escalate to the developer.
- **Never count a unit test tagged with an IT code as coverage.**
- Keep all communication concise and professional. No emojis.

## Procedure

### 0) Gather inputs

- If `epic_issue_number` was not provided, ask: "What is the epic issue number?"
- Do not proceed until the value is confirmed.

### 1) Read context

- Fetch the epic issue `#{epic_issue_number}` including its assigned
  milestone: `gh issue view {epic_issue_number} --json title,body,milestone`.
- Derive `milestone_title` directly from the epic's assigned milestone field
  (`.milestone.title`). If the epic has no milestone assigned, stop and ask
  the user to assign one on GitHub first — never fall back to parsing the
  epic issue's own title text.
- Extract `milestone_number` using pattern `M(\d+(?:\.\d+)?)` against
  `milestone_title` (not the epic issue's title). For example, a milestone
  titled `M4 — {name}` yields milestone number `4`; one titled
  `M4.1 — {name}` yields `4.1`.
- If multiple matches exist or no match is found in `milestone_title`, notify
  and ask for the milestone number manually. Do not proceed until confirmed.
- Derive `milestone_branch` = `milestone/m{milestone_number}`.
- Parse the epic's `## Acceptance Criteria` section for all `[IT_CODE]` markers
  and their checkbox text. Save as a list of `{code, checkbox_line}`.
- Determine `OWNER`/`REPO` from `git remote get-url origin`.

### 2) Validate prerequisites

- Run `git branch --show-current`.
  - If not `milestone_branch`, notify and stop.
- Run `git status --porcelain`.
  - If not empty, notify and stop.
- Fetch sub-issues of the epic via GraphQL (single call, reused in this step
  and step 3):
  ```
  gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") {
    issue(number: EPIC_NUM) { subIssues(first: 50) {
      nodes { number title state labels(first: 10) { nodes { name } } }
    } } } }'
  ```
  - If any sub-issue has state not equal to `CLOSED`, list them and stop.

### 3) Verify IT codes

**Every IT code is proven by Playwright and nothing else.** There is no scope to
determine and no unit-test path to take.

#### A) The spec exists and carries the tag

Check this directly for every code, always. It cannot be inferred from a green
pipeline: a code with no spec runs nothing and breaks nothing, so CI passes while
the behaviour is entirely unproven. It is the failure this check exists for.

```bash
grep -rn "@{IT_CODE}" e2e/features --include="*.spec.ts"
```

- No match → ❌ FAIL ("no test tagged with this AC code"). Stop here for this code.

Also confirm no unit test has claimed one:

```bash
grep -rE '\[Trait\("AC", "[0-9]+IT[0-9]+"\)\]' src/ --include="*.cs"
```

Any hit is a ❌ Blocker and is **never counted as coverage**. A unit test carrying
an IT trait makes a code look proven while asserting something far narrower than the
end-to-end behaviour it names — a false claim that reports as green.

#### B) The spec passes

`ci.yml` runs the full Playwright suite on every push, so prefer its result over a
local run.

```bash
gh pr checks {pr_number}
```

- **`e2e-ci` passed against the head commit** → ✅ PASS for every code whose spec
  exists. Confirm the SHA matches; a green tick on a superseded commit says nothing
  about the branch you are closing.
- **Failed, pending, or run against an older commit, or no PR yet** → verify
  locally. Confirm the `qa` stack is healthy first:
  `curl --silent --fail http://localhost:3000/api/health`, and if not,
  `RESET_DB=true docker compose --profile qa up --build -d`.

  Then per code, from the `e2e/` directory:

  ```bash
  npx playwright test --grep "@{IT_CODE}"
  ```

  - Tests matched and passed → ✅ PASS
  - Tests matched and failed → ❌ FAIL

#### Combine results

- Re-fetch the epic body immediately before editing. For each ✅ PASS code, change
  `- [ ] \`[IT_CODE]\`` to `- [x] \`[IT_CODE]\`` inside the epic's
  `<!-- AC_START -->` block. Leave ❌ FAIL codes as `- [ ]`. Only write the body if
  at least one checkbox state actually changes.
- Compute `n` = codes ✅ PASS, `m` = total IT codes.
- If `n < m`:
  - Output: "Milestone M{milestone_number} acceptance criteria partially passing:
    {n}/{m}. Failing codes: {list}."
  - Stop execution. Do not proceed to step 4.
- If `n == m`, proceed to step 4.

### 4) Push and create PR

- Run `git fetch origin master`.
- Run `git rev-list --count HEAD..origin/master`.
  - If the count is greater than 0, master has moved ahead of this milestone
    branch. Notify the user:
    "milestone/m{milestone_number} is {n} commit(s) behind origin/master.
    Merge or rebase master into this branch before creating the PR, or
    confirm you want to proceed anyway (the PR will be created and conflicts,
    if any, will surface on GitHub)."
  - Accept only `yes | y | confirm` to proceed without resolving. Anything
    else: stop execution.
- Run `git push origin refs/heads/milestone/m{milestone_number}:refs/heads/milestone/m{milestone_number}`
  (fully-qualified refspec — a prior closed milestone leaves a tag of the same
  name, which makes the short-name push ambiguous and fails).
- Create PR to master:
  ```
  gh pr create \
    --base master \
    --head milestone/m{milestone_number} \
    --title "Milestone M{milestone_number} — {milestone_title}" \
    --milestone "{milestone_title}" \
    --body "## Summary\n\nMilestone M{milestone_number} — {milestone_title}.\n\nCloses #{epic_issue_number}."
  ```
- Capture the PR number from the output.

### 5) CodeQL remediation loop

CodeQL runs against this pull request and nowhere earlier, so its findings cannot
surface during story work no matter how well the stories were reviewed. Expect them;
they are a normal stage of closing a milestone, not a sign something went wrong.

Loop until clean:

1. **Wait for the workflows to report.**

   ```bash
   gh pr checks {pr_number} --watch
   ```

2. **Read the findings.**

   ```bash
   gh pr view {pr_number} --json comments,reviews
   gh api repos/{OWNER}/{REPO}/pulls/{pr_number}/comments --jq '.[] | {path, line, body}'
   ```

3. **No findings and CI green** → go to step 6.

4. **Findings** → assign them to a `developer` subagent, spawned in the background.

   The brief carries the finding verbatim — the rule it cites, the file and the line
   — plus `base_branch: milestone/m{n}` and a `journal_dir`. Fixes are committed
   **directly to the milestone branch**: there is no feature branch and no sub-issue,
   because there is no story to attach one to.

   The developer has **no story context** for this code. It may come from any story
   in the milestone, possibly one closed weeks ago, and the story's agent is long
   gone. So the finding must be the entire brief, and the developer is expected to
   read the surrounding code before changing it — a fix that satisfies the scanner
   while quietly altering behaviour will not be caught by a review that already
   happened.

5. **When the fix lands**, CodeQL and CI both re-run automatically on the push.
   Return to step 1.

#### CI is the regression gate

You run nothing yourself. `ci.yml` covers the backend build, tests and format check,
the frontend lint, typecheck, build and tests, and the full Playwright suite against
a compose stack — a better run than you could perform locally, re-executed on every
push of every fix.

What you do is **refuse to proceed while it is red**, including when the only red is
something a CodeQL fix broke on its way past the scanner. A green CodeQL scan on a
red build is not progress.

This matters more here than anywhere else in the run: these fixes edit source that
already passed QA and review, on a branch whose stories are all closed. Nothing is
watching that code any more except CI.

#### Never dismiss a finding

Not yourself, and not by instructing a developer to. A finding that looks like a
false positive may well be one — that judgement is a security decision and it
belongs to the developer. Escalate, and record the ruling in the run journal so the
next milestone does not re-litigate it.

Suppressing an alert with an inline annotation is the same act with extra steps.

### 6) Launch close-milestone-watch command

- Run the `/close-milestone-watch` command with:
  - `$1` = PR number from step 4
  - `$2` = milestone number from step 1
- This command produces its own final summary on completion (PR merge,
  milestone closure, branch deletion, prepare-base, and tagging). Relay that
  summary to the user as the conclusion of this workflow — do not produce a
  separate summary here.