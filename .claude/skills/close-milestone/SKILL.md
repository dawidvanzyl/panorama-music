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
2) verifying milestone IT acceptance criteria (backend, frontend, and e2e) pass,
3) creating a PR from `milestone/m{number}` to `master`,
4) launching the `close-milestone-watch` command that waits for the merge,
5) which then closes the GitHub milestone, deletes the milestone branch, runs
   prepare-base on master, and tags.

## Guardrails

- **Refuse if any sub-issues under the epic are still open.**
- **Refuse if the current branch is not `milestone/m{number}`.**
- **Refuse if the working tree is dirty.**
- **No file edits, no commits beyond git commands.**
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
  titled `M1 — Identity & Auth` yields milestone number `1`; one titled
  `M1.1 — Identity Hardening & QA` yields `1.1`.
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

- Using the sub-issue data fetched in step 2, determine scope per IT code:
  if the corresponding sub-issue has a `layer: frontend` label, the IT code
  is `frontend` scope; if it has a `layer: backend` label, it is `backend`
  scope; otherwise `e2e` scope (full-stack E2E sub-issues carry no
  `layer: backend`/`layer: frontend` label by convention).

> IT codes are issue-scoped (`{issue_number}IT{n}`), not milestone-scoped, so
> there is no shared prefix to wildcard-match across a milestone's sub-issues
> in one run. Verify each code individually, the same way `close-issue` does
> — one filtered test execution per code, never a bulk milestone-wide filter.
> This also still works unchanged for any pre-existing milestone-prefixed
> code (e.g. `M1IT3`) encountered on older, not-yet-migrated issues, since
> each code is matched as a literal string either way.

#### Backend IT codes

- For each backend-scoped `[IT_CODE]`, run:
  `dotnet test --filter "AC=CODE" --no-restore`
- Map each code to its result:
  - ✅ PASS — test ran and passed
  - ❌ FAIL — test ran and failed, or no test found matching this AC code

#### Frontend IT codes

- If any IT codes are frontend-scoped:
  - Read `frontend/package.json` to confirm a test runner is configured.
  - For each frontend-scoped `[IT_CODE]`, run:
    `npx vitest run --reporter=verbose --tags-filter="AC=CODE"`
  - Map each code to its result:
    - ✅ PASS — tests matched and passed
    - ❌ FAIL — tests matched and failed, or no test found matching this AC code
  - If Vitest is not configured or unavailable, mark all frontend-scoped IT
    codes as ❌ FAIL and note "Frontend test runner not available" in the
    failure list.
- If no IT codes are frontend-scoped, skip this subsection.

#### E2E IT codes

- If any IT codes are e2e-scoped:
  - Confirm the `qa` stack is healthy: `curl --silent --fail http://localhost:3000/api/health`.
    If unhealthy, bring it up and wait for health before continuing:
    `RESET_DB=true docker compose --profile qa up --build -d`.
  - For each e2e-scoped `[IT_CODE]`, run (from the `e2e/` directory):
    `npx playwright test --grep "@{IT_CODE}"`
  - Map each code to its result:
    - ✅ PASS — tests matched and passed
    - ❌ FAIL — tests matched and failed, or no test found matching this tag
- If no IT codes are e2e-scoped, skip this subsection.

#### Combine results

- Re-fetch the epic body immediately before editing. For each ✅ PASS code
  (backend, frontend, or e2e), change `- [ ] \`[IT_CODE]\`` to
  `- [x] \`[IT_CODE]\`` in `## Acceptance Criteria`. Leave ❌ FAIL codes as
  `- [ ]`. Only write the body if at least one checkbox state actually changes.
- Compute `n` = total codes ✅ PASS (backend + frontend + e2e), `m` = total IT codes.
- If `n < m`:
  - Output: "Milestone M{milestone_number} integration tests partially
    passing: {n}/{m}. Failing codes: {list} (grouped Backend/Frontend/E2E)."
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

### 5) Launch close-milestone-watch command

- Run the `/close-milestone-watch` command with:
  - `$1` = PR number from step 4
  - `$2` = milestone number from step 1
- This command produces its own final summary on completion (PR merge,
  milestone closure, branch deletion, prepare-base, and tagging). Relay that
  summary to the user as the conclusion of this workflow — do not produce a
  separate summary here.