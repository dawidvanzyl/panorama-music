---
name: close-issue
description: >
  Load this skill when the user says "close issue", "close-issue", or "/close-issue".
  Verifies IT and UC acceptance criteria for a story issue, ticks off passing
  checkboxes, and closes the issue only if all criteria pass and the linked PR
  has been merged.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Role

This skill verifies and records, and nothing else. A code that doesn't pass is a
finding for the tech lead, not work for you, so never write a test, fix one, or
modify any file in the working tree, and never commit or push. The only write is the
issue body's checkboxes and, in `subagent` mode, the report in `journal_dir`. The
epic's state belongs to `close-milestone`, so leave it alone.

## Inputs

- `issue_number`, `pr_number`: infer them from the session in `interactive` mode, and
  ask for either one that's missing. Both are required in `subagent` mode.
- `journal_dir`: required in `subagent` mode. The absolute path to the story's journal.
- `mode`: `interactive` (default) or `subagent`.

In `subagent` mode, a missing input is `BLOCKED (1)`, naming it. Never ask a question
there: a background worker has no turn for the answer to land in.

## Procedure

### 1) PR merged? (hard gate)

Run `gh pr view {pr_number} --json state,mergedAt`. If the state isn't `MERGED`,
report "PR #{pr_number} has not been merged (state: {state}). Issue #{issue_number}
cannot be closed." and stop.

### 2) Extract codes

Run `gh issue view {issue_number} --json title,body,milestone`. Only lines matching
`- [ ] \`{CODE}\` …` count. Never infer a code from free text.

- **IT codes** appear only under `## Test Specifications`, which every issue has. An
  `N/A` there is valid (most tech debt is internal). A missing section means the
  issue wasn't built from the template, so report that.
- **UC codes** appear under `## Acceptance Criteria (G/W/T)`. Note whether each one
  sits under `### Backend` or `### Frontend`. An empty section is valid for stories
  planned with empty criteria; note it and continue.

### 3) Verify each code

Each code ends as ✅ PASS or ❌ FAIL. A code with no tagged test is ❌ FAIL ("no test
tagged with this AC code").

**Backend UC.** Find it with `grep -r '\[Trait("AC", "CODE")\]' src/ --include="*.cs"`,
then run `dotnet test --filter "AC=CODE" --no-build`.

**Frontend UC.** Run `npx vitest run --reporter=verbose --tags-filter="CODE"` once per
code. Don't map a single full-suite run back to individual codes. The tag is the bare
code (`{ tags: ['292UC10'] }`). The `AC=` prefix exists only because xUnit traits are
key-value pairs, so it matches nothing in vitest.

**Mis-tagged IT codes.** IT codes are proven by Playwright alone. Check that no unit
test carries one:

```bash
grep -rE '\[Trait\("AC", "[0-9]+IT[0-9]+"\)\]' src/ --include="*.cs"
grep -rE '[0-9]+IT[0-9]+' frontend/src --include="*.test.ts" --include="*.test.tsx"
```

Any hit is a ❌ Blocker that prevents closing, and it is never counted as coverage.
It makes a code look proven while asserting far less than the end-to-end behaviour
the code names: a false green, which is worse than an obvious gap.

**IT codes (E2E):**
1. **Does the spec exist?** Check with `grep -rn "@CODE" e2e/features --include="*.spec.ts"`.
   A green pipeline can't tell you this, because a code with no spec runs nothing and
   breaks nothing. If there's no match, it's ❌ FAIL.
2. **Does it pass?** Prefer CI. `gh pr checks {pr_number}`: if `e2e-ci` passed on the
   merge commit (confirm the SHA; a tick on a superseded commit proves nothing), every
   code whose spec exists is ✅ PASS. Otherwise verify locally:
   - Bring the stack up with
     `curl --silent --fail http://localhost:3000/api/health || RESET_DB=true docker compose --profile qa up --build -d`,
     and wait until it's healthy.
   - From `e2e/`, run `npx playwright test --grep "@CODE"` for each code.

### 4) Record and decide

Let `n` be the number of ✅ codes and `m` the total number of IT and UC checkbox lines.

Update the checkboxes idempotently:
- Re-fetch the body immediately before editing, so you never write a stale body.
- Change `- [ ]` to `- [x]` for each ✅ code only.
- Write the body only if something changed. Pass it inline, with no temp files:

```bash
gh issue edit {issue_number} --body "$(cat <<'EOF'
{updated body}
EOF
)"
```

- **`n < m`, or any mis-tagged blocker:** leave the issue open and report
  "Acceptance criteria partially verified for #{issue_number}: {n}/{m} passing.
  Issue remains open."
- **`n == m` and no blockers:** run `gh issue close {issue_number}`. If it's already
  closed, say so.

### 5) Summary

Report:
- PR status
- `n/m`
- IT codes with ✅/❌
- UC codes with ✅/❌, grouped Backend/Frontend
- any mis-tagged IT traits
- the issue state

In `interactive` mode, return it directly. In `subagent` mode, write it to
`{journal_dir}/close-{issue_number}.md` as you go, then reply with only (per
`.claude/shared/subagent-contract.md`):

```
VERDICT: {CLOSED | BLOCKED (n)}
REPORT: {journal_dir}/close-{issue_number}.md
AC: {n}/{m} passing
```

`BLOCKED` covers an unmerged PR and any failing, unverifiable or mis-tagged code.
Never report `CLOSED` on a partially verified issue. The tech lead reads it as proof
the story is finished.

Keep communication concise. Use no emojis except ✅/❌.
