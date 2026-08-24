---
name: close-issue
description: >
  Load this skill when the user says "close issue", "close-issue", or "/close-issue".
  Verifies IT and UC acceptance criteria for a story issue, ticks off passing
  checkboxes, and closes the issue only if all criteria pass and the linked PR
  has been merged.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post:

> "Loaded skill: **close-issue**. Verifying acceptance criteria and PR status..."

---

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the
  current session; required in `subagent` mode.
- `pr_number`: prefer to infer from the PR created earlier in the current
  session; required in `subagent` mode.
- `journal_dir`: required in `subagent` mode. Absolute path to this story's journal
  directory.
- `mode`: `interactive` (default) or `subagent`.

`interactive` — if either number is missing, ask for it. Do not proceed until both
are confirmed.

`subagent` — every required input arrives in the brief. If one is missing, report
`BLOCKED (1)` naming it rather than asking; a background worker has no interactive
turn for an answer to land in.

---

## Procedure

### 1) Check PR merge status (HARD GATE)

```bash
gh pr view #{pr_number} --json state,mergedAt
```

- If `state` is not `MERGED`:
  - Output: "PR #{pr_number} has not been merged (state: {state}). Issue
    #{issue_number} cannot be closed."
  - Stop execution. Do not proceed to AC verification.

---

### 2) Fetch issue and extract AC codes

```bash
gh issue view #{issue_number} --json title,body,milestone
```

Extract codes from the issue body, following the `sub-issue.md` template
structure:

- **IT codes** — there are only two code types, IT and UC. IT codes appear in
  exactly one place, `## Test Specifications`, one line per code:
  ```
  - [ ] `[IT_CODE]` <text>
  ```
  The section is present on every issue type. `N/A` means the issue has no
  end-to-end behaviour to prove, which is a valid state — most tech debt is
  internal. Distinguish it from an absent section, which means the issue was not
  built from the template.
- **UC codes** — from `## Acceptance Criteria (G/W/T) > ### Backend` and
  `### Frontend`, lines matching:
  ```
  - [ ] `[UC_CODE]` <text>
  ```
  Note which subsection (`### Backend` / `### Frontend`) each UC lives under.

If a checkbox line does not match `- [ ] \`[CODE]\` ...`, skip it — do not
infer codes from free text.

If `## Acceptance Criteria (G/W/T)` is empty or absent, there are no UC codes
to verify; this is expected for sub-issues flagged with empty criteria in
`plan-milestone.md`. Note this and continue with IT codes only.

---

### 3) Verify each code

#### Backend (UC codes under `### Backend` only)

For each code:

```bash
grep -r '\[Trait("AC", "CODE")\]' src/ --include="*.cs"
```

- Found → run:
  ```bash
  dotnet test --filter "AC=CODE" --no-build
  ```
  - Pass → ✅ PASS
  - Fail → ❌ FAIL
- Not found → ❌ FAIL ("no test tagged with this AC code").

**IT codes are never verified here.** They are proven by Playwright and nothing
else, so no unit test should carry one. Check that no test does:

```bash
grep -rE '\[Trait\("AC", "[0-9]+IT[0-9]+"\)\]' src/ --include="*.cs"
grep -rE '[0-9]+IT[0-9]+' frontend/src --include="*.test.ts" --include="*.test.tsx"
```

Any hit is a ❌ Blocker, reported and **never counted as coverage**. A unit test
carrying an IT trait makes a code look proven while asserting something far
narrower than the end-to-end behaviour the code names — a false claim that reports
as green, which is worse than an obvious gap.

#### Frontend (UC under `### Frontend`)

For each code, do not assume location — search the whole frontend test suite:

```bash
npx vitest run --reporter=verbose --tags-filter="AC=CODE"
```

- No tests matched the tag → ❌ FAIL ("no test tagged with this AC code").
- Tests matched and passed → ✅ PASS
- Tests matched and failed → ❌ FAIL

> Run one filtered execution per code (this is the per-AC equivalent of the
> backend `--filter "AC=CODE"` run). Do not attempt to map a single full-suite
> run back to individual codes.

#### E2E (every IT code)

All IT codes are verified by the Playwright suite in `e2e/`, once each.

**Step A — the spec exists and carries the tag.** This cannot be inferred from a
green pipeline: a code with no spec at all runs nothing and breaks nothing, so CI
passes while the behaviour is unproven. It is the failure this check exists for.

```bash
grep -rn "@CODE" e2e/features --include="*.spec.ts"
```

- No match → ❌ FAIL ("no test tagged with this AC code"). Stop here for this code.

**Step B — the spec passes.** Prefer the CI run over a local one. `ci.yml` runs the
full Playwright suite on every push, so when it has already run against the merge
commit, re-running each code locally re-proves what is known and costs a Docker
stack plus minutes per code.

```bash
gh pr checks {pr_number}
```

- **`e2e-ci` passed against the merge commit** → ✅ PASS for every code whose spec
  exists. Confirm the SHA matches; a green tick on a superseded commit says nothing
  about the code being closed.
- **Failed, pending, or run against an older commit** → verify locally. Confirm the
  `qa` stack is healthy first:

  ```bash
  curl --silent --fail http://localhost:3000/api/health
  ```

  If that fails, bring it up and wait for health:

  ```bash
  RESET_DB=true docker compose --profile qa up --build -d
  ```

  Then, per unique code, from the `e2e/` directory:

  ```bash
  npx playwright test --grep "@CODE"
  ```

  - Tests matched and passed → ✅ PASS
  - Tests matched and failed → ❌ FAIL

---

### 4) Evaluate results

Compute across every checkbox line:

- `n` = checkbox lines with ✅ PASS
- `m` = total checkbox lines (IT + UC)

---

### 4a) Failure handling (STOP CONDITION)

If `n < m`:

- Tick only the checkboxes for codes that are ✅ PASS (see step 5).
- Leave failing/not-found codes unchecked.
- Do **not** close the issue.
- Output:

  > "Acceptance criteria partially verified for #{issue_number}: {n}/{m}
  > passing. Issue remains open."

- Stop execution.

---

### 5) Update issue checkboxes (idempotent)

- Re-fetch the issue body before editing.
- For each ✅ PASS code, change `- [ ] \`[CODE]\`` to `- [x] \`[CODE]\`` on its
  checkbox line in the issue body.
- Leave ❌ FAIL codes as `- [ ]` on every matching line.
- Only write the body if at least one checkbox state actually changes.
- Do not write any temporary files. Pass the updated body directly via `--body`.

```bash
gh issue edit #{issue_number} --body "$(cat <<'EOF'
{updated body content}
EOF
)"
```

---

### 6) Close issue

Only reached if `n == m` (all codes passed in step 4).

If issue is already closed:

- Notify and continue.

If open:

```bash
gh issue close #{issue_number}
```

---

### 7) Summary

`interactive` — return:

- PR merge status: merged
- AC result: n/m passing
- IT codes: list with ✅/❌
- UC codes: list with ✅/❌ (grouped Backend/Frontend if applicable)
- Mis-tagged IT traits found in unit tests, if any
- Issue state: closed/open

`subagent` — write the same content to `{journal_dir}/close-{issue_number}.md` **as
you go**, then reply with the verdict block only, per
`.claude/shared/subagent-contract.md`:

```
VERDICT: {CLOSED | BLOCKED (n)}
REPORT: {journal_dir}/close-{issue_number}.md
AC: {n}/{m} passing
```

`BLOCKED` covers both an unmerged PR and any failing or unverifiable code. Never
report `CLOSED` on a partially verified issue — the tech lead reads this verdict as
proof the story is finished, and a false one ends the story with acceptance criteria
that were never met.

## Guardrails

- Never close an issue if the linked PR is not merged.
- Never close an issue with any failing or unverifiable AC code.
- Never tick a checkbox for a code that did not pass.
- Never count a unit test tagged with an IT code as coverage. Report it as a
  blocker; the code remains unproven.
- Never write a test, fix a failing one, or modify any source to make a code pass.
  This skill verifies and records — nothing else. A code that does not pass is a
  finding for the tech lead, not work to do here.
- Re-fetch the issue body immediately before editing; never write a stale body.
- Do not modify epic/parent issue state — that is handled by `close-milestone`.
- Never ask a question in `subagent` mode — report `BLOCKED` and let the tech lead
  decide.
- Keep communication concise and direct. No emojis except status indicators
  (✅/❌).
- Never commit or push to the working tree
- Never make modification to any files on the working tree